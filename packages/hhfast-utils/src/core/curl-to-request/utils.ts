import type {
  CurlHeaderItem,
  CurlQueryItem,
  CurlTableValueType,
  ParsedCurlBody,
} from './types'

/**
 * @description 判断值是否为变量引用片段。
 */
export const isVariableRef = (value: string): boolean => /\$\w+|\$\{[^}]+\}/.test(value)

/**
 * @description 按首个分隔符切分字符串。
 */
export const splitOnce = (value: string, separator: string): [string, string] => {
  const index = value.indexOf(separator)
  if (index < 0) {
    return [value, '']
  }
  return [value.slice(0, index), value.slice(index + separator.length)]
}

/**
 * @description 将 header 行解析为键值。
 */
export const parseHeaderLine = (value: string): CurlHeaderItem => {
  const [key, v] = splitOnce(value, ':')
  return {
    key: key.trim(),
    value: v.trim(),
    raw: value,
  }
}

/**
 * @description 解析 query 或 form 键值字符串。
 */
export const parseKvPairs = (value: string, pairSeparator: string): CurlQueryItem[] =>
  value
    .split(pairSeparator)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [key, v] = splitOnce(item, '=')
      return {
        key: decodeURIComponent(key || ''),
        value: decodeURIComponent(v || ''),
      }
    })

/**
 * @description 解析 URL query 参数。
 */
export const parseUrlQuery = (url: string): CurlQueryItem[] => {
  const queryIndex = url.indexOf('?')
  if (queryIndex < 0 || queryIndex === url.length - 1) {
    return []
  }
  const queryText = url.slice(queryIndex + 1)
  return parseKvPairs(queryText, '&')
}

/**
 * @description 识别字符串值类型。
 */
export const detectStringValueType = (value: string): CurlTableValueType => {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'empty'
  }
  if (trimmed === 'null') {
    return 'null'
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return 'boolean'
  }
  if (!Number.isNaN(Number(trimmed))) {
    return 'number'
  }
  if ((trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return 'object'
  }
  if ((trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 'array'
  }
  return 'string'
}

/**
 * @description 尝试将 body 文本结构化。
 */
export const parseBody = (raw: string): ParsedCurlBody => {
  const text = raw.trim()
  if (!text) {
    return { raw: '', type: 'empty' }
  }
  try {
    const structured = JSON.parse(text) as unknown
    return {
      raw,
      type: 'json',
      structured,
    }
  }
  catch {
    // ignore
  }
  if (text.includes('=') && (text.includes('&') || !text.includes('{'))) {
    const structured = parseKvPairs(text, '&').reduce<Record<string, string>>((acc, item) => {
      if (!item.key) {
        return acc
      }
      acc[item.key] = item.value
      return acc
    }, {})
    return {
      raw,
      type: 'form-urlencoded',
      structured,
    }
  }
  return {
    raw,
    type: 'raw',
  }
}
