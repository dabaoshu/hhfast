import type { JsonTreeNode, JsonTreeValueType } from '../types'

export interface ValueLeafOptions {
  label: string
  path: string
  value: unknown
  valueType: JsonTreeValueType
}

/**
 * 构建值模式叶子节点（value 字段保留原始值）。
 */
export function buildValueLeaf(options: ValueLeafOptions): JsonTreeNode {
  const { label, path, valueType, value } = options
  return {
    key: path,
    path,
    label,
    valueType,
    nodeKind: 'value',
    value,
  }
}
