import type { CSSProperties } from 'vue'

/**
 * 树数据输入模式。
 */
export type TreeDataMode = 'auto' | 'tree' | 'list'

/**
 * 树组件的原始节点类型。
 */
export interface TreeRawNode {
  [key: string]: unknown
}

/**
 * 组件内部统一节点结构。
 */
export interface TreeNode {
  /** 节点唯一标识。 */
  id: string | number
  /** 节点展示文案。 */
  label: string
  /** 节点层级（根节点为 0）。 */
  level: number
  /** 节点排序索引。 */
  index?: number
  /** 原始数据。 */
  raw: TreeRawNode
  /** 子节点。 */
  children: TreeNode[]
}

/**
 * 树组件 Props。
 */
export interface TreeProps {
  /** 输入数据，支持 tree/list 两种结构。 */
  data: TreeRawNode[]
  /** 数据模式：auto 自动识别，tree/list 强制指定。 */
  dataMode?: TreeDataMode
  /** 节点 id 字段名。 */
  idKey?: string
  /** 节点标题字段名（tree/list 通用）。 */
  labelKey?: string
  /** tree 模式子节点字段名。 */
  childrenKey?: string
  /** list 模式父节点 id 字段名。 */
  pidKey?: string
  /** list 模式层级字段名（可选，仅用于兜底排序）。 */
  levelKey?: string
  /** 节点排序字段名（可选）。 */
  indexKey?: string
  /** 缩进像素。 */
  indent?: number
  /** 根节点是否默认展开。 */
  defaultExpandAll?: boolean
  /** 根元素 class。 */
  class?: string
  /** 根元素 style。 */
  style?: CSSProperties | string
}

/**
 * 节点点击事件。
 */
export interface TreeEmits {
  /**
   * 点击节点时触发。
   *
   * @param e - 事件名
   * @param node - 统一节点
   */
  (e: 'nodeClick', node: TreeNode): void
}

/**
 * 叶子节点插槽参数。
 */
export interface TreeLeafSlotProps {
  /** 当前节点。 */
  node: TreeNode
}

/**
 * 非叶子节点插槽参数。
 */
export interface TreeNonLeafSlotProps {
  /** 当前节点。 */
  node: TreeNode
  /** 是否处于展开状态。 */
  expanded: boolean
  /** 触发展开/收起。 */
  toggle: () => void
}

/**
 * 树组件插槽定义。
 */
export interface TreeSlots {
  /**
   * 叶子节点内容插槽。
   *
   * @param props - 叶子节点插槽参数
   */
  leaf?: (props: TreeLeafSlotProps) => unknown
  /**
   * 非叶子节点内容插槽。
   *
   * @param props - 非叶子节点插槽参数
   */
  nonLeaf?: (props: TreeNonLeafSlotProps) => unknown
}
