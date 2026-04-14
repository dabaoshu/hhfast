import type {
  CurlSectionTables,
  CurlTableRow,
  CurlTableValueType,
  ParseCurlCommandOptions,
  ParsedCurlRequest,
} from './types'
import {
  detectStringValueType,
  isVariableRef,
  parseBody,
  parseHeaderLine,
  parseKvPairs,
  parseUrlQuery,
} from './utils'

const METHOD_FLAGS = new Set(['-X', '--request'])
const HEADER_FLAGS = new Set(['-H', '--header'])
const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'])
const FORM_FLAGS = new Set(['-F', '--form'])
const URL_FLAGS = new Set(['--url'])
const IGNORE_FLAGS = new Set(['--compressed', '--insecure', '-k', '--location', '-L', '--silent', '-s'])

/**
 * @description 将 curl 命令文本切分为 token（支持引号与转义）。
 */
export const tokenizeCurlCommand = (command: string): string[] => {
  const normalized = command
    .replace(/\\\r?\n/g, ' ')
    .replace(/`\r?\n/g, ' ')
    .trim()
  if (!normalized) {
    return []
  }

  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false

  for (const char of normalized) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && quote !== "'") {
      escaped = true
      continue
    }

    if (char === '"' || char === "'") {
      if (!quote) {
        quote = char
        continue
      }
      if (quote === char) {
        quote = null
        continue
      }
      current += char
      continue
    }

    if (!quote && /\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (current) {
    tokens.push(current)
  }
  return tokens
}

const isLikelyUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value) || value.startsWith('localhost') || value.startsWith('/')

const getPathFromUrl = (url: string): string => {
  try {
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url)
      return parsed.pathname || '/'
    }
  }
  catch {
    // ignore
  }
  const noQuery = url.split('?')[0] ?? ''
  return noQuery || '/'
}

const resolveMethod = (parsed: ParsedCurlRequest): string => {
  if (parsed.method !== 'GET') {
    return parsed.method
  }
  if (parsed.forms.length > 0 || parsed.body.type !== 'empty') {
    return 'POST'
  }
  return 'GET'
}

/**
 * @description 解析 token 列表为结构化请求对象。
 */
export const parseCurlTokens = (
  tokens: string[],
  options: ParseCurlCommandOptions = {},
): ParsedCurlRequest => {
  const allowNonCurlPrefix = options.allowNonCurlPrefix ?? true
  const cursorTokens = [...tokens]
  if (!allowNonCurlPrefix && cursorTokens[0] !== 'curl') {
    throw new Error('命令必须以 curl 开头。')
  }
  if (cursorTokens[0] === 'curl') {
    cursorTokens.shift()
  }

  const parsed: ParsedCurlRequest = {
    method: 'GET',
    url: '',
    path: '/',
    query: [],
    headers: [],
    body: { raw: '', type: 'empty' },
    forms: [],
    extras: [],
    tokens,
  }

  const bodyParts: string[] = []
  for (let i = 0; i < cursorTokens.length; i += 1) {
    const token = cursorTokens[i]
    const next = cursorTokens[i + 1]

    if (METHOD_FLAGS.has(token)) {
      if (next) {
        parsed.method = next.toUpperCase()
        i += 1
      }
      continue
    }

    if (HEADER_FLAGS.has(token)) {
      if (next) {
        parsed.headers.push(parseHeaderLine(next))
        i += 1
      }
      continue
    }

    if (DATA_FLAGS.has(token)) {
      if (next) {
        bodyParts.push(next)
        i += 1
      }
      continue
    }

    if (FORM_FLAGS.has(token)) {
      if (next) {
        parsed.forms.push(...parseKvPairs(next, '&'))
        i += 1
      }
      continue
    }

    if (URL_FLAGS.has(token)) {
      if (next) {
        parsed.url = next
        i += 1
      }
      continue
    }

    if (token.startsWith('-')) {
      if (IGNORE_FLAGS.has(token)) {
        continue
      }
      if (next && !next.startsWith('-')) {
        parsed.extras.push({ flag: token, value: next })
        i += 1
      }
      else {
        parsed.extras.push({ flag: token })
      }
      continue
    }

    if (!parsed.url && isLikelyUrl(token)) {
      parsed.url = token
      continue
    }

    parsed.extras.push({ flag: 'arg', value: token })
  }

  const joinedBody = bodyParts.join('&')
  parsed.body = parseBody(joinedBody)
  parsed.query = parseUrlQuery(parsed.url)
  parsed.path = getPathFromUrl(parsed.url)
  parsed.method = resolveMethod(parsed)
  return parsed
}

/**
 * @description 直接解析 curl 命令为结构化对象。
 */
export const parseCurlCommand = (
  command: string,
  options: ParseCurlCommandOptions = {},
): ParsedCurlRequest => {
  const tokens = tokenizeCurlCommand(command)
  console.log('tokens', tokens)
  return parseCurlTokens(tokens, options)
}

const rowValueType = (value: string): CurlTableValueType => detectStringValueType(value)

/**
 * @description 将解析结果转换为单表数据。
 */
export const toFlatTableRows = (parsed: ParsedCurlRequest): CurlTableRow[] => {
  const rows: CurlTableRow[] = [
    {
      section: 'requestLine',
      key: 'method',
      value: parsed.method,
      valueType: rowValueType(parsed.method),
      source: 'curl',
      isVariableRef: false,
    },
    {
      section: 'requestLine',
      key: 'url',
      value: parsed.url,
      valueType: rowValueType(parsed.url),
      source: 'url',
      isVariableRef: isVariableRef(parsed.url),
    },
    {
      section: 'requestLine',
      key: 'path',
      value: parsed.path,
      valueType: rowValueType(parsed.path),
      source: 'url',
      isVariableRef: isVariableRef(parsed.path),
    },
  ]

  parsed.query.forEach(item => {
    rows.push({
      section: 'query',
      key: item.key,
      value: item.value,
      valueType: rowValueType(item.value),
      source: 'url.query',
      isVariableRef: isVariableRef(item.value),
    })
  })

  parsed.headers.forEach(item => {
    rows.push({
      section: 'headers',
      key: item.key,
      value: item.value,
      valueType: rowValueType(item.value),
      source: '-H',
      isVariableRef: isVariableRef(item.value),
    })
  })

  if (parsed.body.type !== 'empty') {
    rows.push({
      section: 'body',
      key: 'raw',
      value: parsed.body.raw,
      valueType: rowValueType(parsed.body.raw),
      source: '-d',
      isVariableRef: isVariableRef(parsed.body.raw),
    })
    if (parsed.body.structured && typeof parsed.body.structured === 'object') {
      Object.entries(parsed.body.structured as Record<string, unknown>).forEach(([key, value]) => {
        const text = typeof value === 'string' ? value : JSON.stringify(value)
        rows.push({
          section: 'body',
          key,
          value: text,
          valueType: rowValueType(text),
          source: parsed.body.type,
          isVariableRef: isVariableRef(text),
        })
      })
    }
  }

  parsed.forms.forEach(item => {
    rows.push({
      section: 'form',
      key: item.key,
      value: item.value,
      valueType: rowValueType(item.value),
      source: '-F',
      isVariableRef: isVariableRef(item.value),
    })
  })

  parsed.extras.forEach(item => {
    rows.push({
      section: 'extras',
      key: item.flag,
      value: item.value ?? '',
      valueType: rowValueType(item.value ?? ''),
      source: 'extra',
      isVariableRef: isVariableRef(item.value ?? ''),
    })
  })
  return rows
}

/**
 * @description 将解析结果分区为多表结构。
 */
export const toSectionTables = (parsed: ParsedCurlRequest): CurlSectionTables => {
  const rows = toFlatTableRows(parsed)
  return {
    requestLine: rows.filter(row => row.section === 'requestLine'),
    query: rows.filter(row => row.section === 'query'),
    headers: rows.filter(row => row.section === 'headers'),
    body: rows.filter(row => row.section === 'body'),
    form: rows.filter(row => row.section === 'form'),
    extras: rows.filter(row => row.section === 'extras'),
  }
}
