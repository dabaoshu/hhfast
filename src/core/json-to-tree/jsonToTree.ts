import { buildNode } from './tree/builder'
import type { JsonToTreeOptions, JsonTreeNode } from './types'

const DEFAULT_ROOT_LABEL = 'root'
const DEFAULT_PATH_SEPARATOR = '.'

/**
 * 将任意 JSON 值转换为树结构节点。
 */
export function jsonToTree(data: unknown, options: JsonToTreeOptions = {}): JsonTreeNode {
  const rootLabel = options.rootLabel ?? DEFAULT_ROOT_LABEL
  return buildNode({
    label: rootLabel,
    path: rootLabel,
    value: data,
    options: {
      pathSeparator: options.pathSeparator ?? DEFAULT_PATH_SEPARATOR,
      leafNodeMode: options.leafNodeMode ?? 'value',
    },
    userOptions: options,
  })
}


