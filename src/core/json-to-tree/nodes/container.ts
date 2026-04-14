import type {
  JsonLeafNodeMode,
  JsonToTreeOptions,
  JsonTreeNode,
  JsonTreeValueType,
} from '../types'
import { buildTypeContainerValue } from './typeNode'

export interface ContainerOptions {
  path: string
  label: string
  value: unknown
  valueType: JsonTreeValueType
  leafNodeMode: JsonLeafNodeMode
  children: JsonTreeNode[]
  options: JsonToTreeOptions
}

/**
 * 构建容器节点（对象或数组）。
 */
export function buildContainer(options: ContainerOptions): JsonTreeNode {
  const { path, label, valueType, leafNodeMode, children, options: opts } = options
  return {
    key: path,
    path,
    label,
    valueType,
    nodeKind: leafNodeMode === 'type' ? 'type' : undefined,
    value: getContainerValue(options),
    children,
  }
}

function getContainerValue(params: ContainerOptions): unknown {
  const { value, leafNodeMode, options } = params
  if (leafNodeMode === 'type') {
    return buildTypeContainerValue(value, options.typeExpressionBuilder)
  }
  if (options.keepRawValueOnContainer) {
    return value
  }
  return undefined
}
