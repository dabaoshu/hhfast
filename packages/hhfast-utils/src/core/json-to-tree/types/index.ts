/**
 * JSON 树节点值类型。
 */
export type JsonTreeValueType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'

/**
 * 叶子节点构建模式。
 * - `value`: 叶子节点保留真实值。
 * - `type`: 叶子节点显示类型表达式。
 */
export type JsonLeafNodeMode = 'value' | 'type'

/**
 * JSON 树节点定义。
 */
export interface JsonTreeNode {
  /** 当前节点的唯一键。 */
  key: string
  /** 当前节点在原始 JSON 中的路径（点路径）。 */
  path: string
  /** 当前节点名称（对象键名或数组索引）。 */
  label: string
  /** 当前节点值类型。 */
  valueType: JsonTreeValueType
  /** 节点语义类型：值节点或类型节点。 */
  nodeKind?: JsonLeafNodeMode
  /** 当前节点原始值（仅叶子节点或被配置为保留值时存在）。 */
  value?: unknown
  /** 子节点列表。 */
  children?: JsonTreeNode[]
}

/**
 * 节点构建上下文（用于 nodeTransformer 回调）。
 */
export interface JsonTreeNodeBuildContext {
  /** 当前节点路径。 */
  path: string
  /** 当前节点标签。 */
  label: string
  /** 当前节点值。 */
  value: unknown
  /** 当前节点值类型。 */
  valueType: JsonTreeValueType
  /** 当前节点是否叶子节点。 */
  isLeaf: boolean
  /** 当前模式。 */
  leafNodeMode: JsonLeafNodeMode
}

/**
 * JSON 转树形结构参数。
 */
export interface JsonToTreeOptions {
  /** 根节点标题，默认 `root`。 */
  rootLabel?: string
  /** 是否在非叶子节点保留原始值，默认 `false`。 */
  keepRawValueOnContainer?: boolean
  /** 叶子节点构建模式，默认 `value`。 */
  leafNodeMode?: JsonLeafNodeMode
  /** 路径分隔符，默认 `.`。 */
  pathSeparator?: string
  /** 类型模式下数组合并子节点的标签，默认 `item`。 */
  typeArrayItemLabel?: string
  /** 自定义类型表达式生成器。 */
  typeExpressionBuilder?: (
    value: unknown,
    defaultBuilder: (input: unknown) => string,
  ) => string
  /** 节点后处理器，可用于统一改写 label/key/value 等。 */
  nodeTransformer?: (node: JsonTreeNode, context: JsonTreeNodeBuildContext) => JsonTreeNode
}
