import type { JsonToTreeOptions, JsonTreeNode, JsonTreeValueType } from '../types'

export interface TypeLeafOptions {
  label: string
  path: string
  value: unknown
  valueType: JsonTreeValueType
  typeExpressionBuilder?: JsonToTreeOptions['typeExpressionBuilder']
}

/**
 * 构建类型模式叶子节点（value 字段为类型表达式字符串）。
 */
export function buildTypeLeaf(options: TypeLeafOptions): JsonTreeNode {
  const { label, path, value, valueType, typeExpressionBuilder } = options
  return {
    key: path,
    path,
    label,
    valueType,
    nodeKind: 'type',
    value: buildTypeExpression(value, typeExpressionBuilder),
  }
}

/**
 * 构建容器节点的类型表达式值。
 */
export function buildTypeContainerValue(
  value: unknown,
  typeExpressionBuilder?: JsonToTreeOptions['typeExpressionBuilder'],
): string {
  return buildTypeExpression(value, typeExpressionBuilder)
}

export interface TypeArrayChildrenOptions {
  parentPath: string
  items: unknown[]
  options: JsonToTreeOptions
  buildChildNode: (params: { label: string; path: string; value: unknown }) => JsonTreeNode
}

/**
 * 类型模式下构建数组成员（合并为 1 个 item 子节点）。
 */
export function buildTypeArrayChildren(params: TypeArrayChildrenOptions): JsonTreeNode[] {
  const { parentPath, items, options, buildChildNode } = params
  const mergedValue = mergeAsTypeSample(items)
  const itemLabel = options.typeArrayItemLabel ?? 'item'
  const sep = options.pathSeparator ?? '.'

  return [
    buildChildNode({
      label: itemLabel,
      path: `${parentPath}${sep}${itemLabel}`,
      value: mergedValue,
    }),
  ]
}

// ---------------------------------------------------------------------------
// 以下为类型表达式内部构建逻辑
// ---------------------------------------------------------------------------

function buildTypeExpression(
  value: unknown,
  customBuilder?: JsonToTreeOptions['typeExpressionBuilder'],
): string {
  const defaultBuilder = (input: unknown) => buildTypeExpressionCore(input)
  if (customBuilder) {
    return customBuilder(value, defaultBuilder)
  }
  return defaultBuilder(value)
}

function buildTypeExpressionCore(value: unknown): string {
  const t = getValueType(value)

  if (t === 'array') {
    const arr = Array.isArray(value) ? value : []
    return `array<${buildArrayElementType(arr)}>`
  }
  if (t === 'object') {
    const obj = isRecord(value) ? value : {}
    const entries = Object.entries(obj)
    if (entries.length === 0) return '{}'
    const body = entries
      .map(([k, v]) => `${k}:${buildTypeExpressionCore(v)}`)
      .join(',')
    return `{${body}}`
  }
  return t
}

function buildArrayElementType(items: unknown[]): string {
  if (items.length === 0) return 'unknown'
  const allObjects = items.every(i => getValueType(i) === 'object')
  if (allObjects) return buildMergedObjectType(items as Record<string, unknown>[])
  const exprs = [...new Set(items.map(i => buildTypeExpressionCore(i)))]
  return exprs.length === 1 ? exprs[0] : exprs.join(' | ')
}

function buildMergedObjectType(items: Record<string, unknown>[]): string {
  const keys = [...new Set(items.flatMap(i => Object.keys(i)))]
  const body = keys.map(key => {
    const vals = items.filter(i => key in i).map(i => i[key])
    return `${key}:${buildUnionType(vals)}`
  })
  return `{${body.join(',')}}`
}

function buildUnionType(values: unknown[]): string {
  if (values.length === 0) return 'unknown'
  const exprs = [...new Set(values.map(v => buildTypeExpressionCore(v)))]
  return exprs.length === 1 ? exprs[0] : exprs.join(' | ')
}

function mergeAsTypeSample(values: unknown[]): unknown {
  if (values.length === 0) return 'unknown'
  const typeSet = new Set(values.map(v => getValueType(v)))
  if (typeSet.size > 1) return buildUnionType(values)
  const [singleType] = [...typeSet]

  if (singleType === 'object') return mergeObjects(values as Record<string, unknown>[])
  if (singleType === 'array') {
    const nestedItems = (values as unknown[][]).flat()
    return [mergeAsTypeSample(nestedItems)]
  }
  return getTypePlaceholder(singleType)
}

function mergeObjects(items: Record<string, unknown>[]): Record<string, unknown> {
  const keys = [...new Set(items.flatMap(i => Object.keys(i)))]
  return Object.fromEntries(
    keys.map(key => {
      const vals = items.filter(i => key in i).map(i => i[key])
      return [key, mergeAsTypeSample(vals)]
    }),
  )
}

function getTypePlaceholder(t: JsonTreeValueType): unknown {
  const map: Record<JsonTreeValueType, unknown> = {
    string: '',
    number: 0,
    boolean: true,
    null: null,
    undefined: undefined,
    array: [],
    object: {},
  }
  return map[t] ?? 'unknown'
}

function getValueType(value: unknown): JsonTreeValueType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'undefined': return 'undefined'
    default: return 'object'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
