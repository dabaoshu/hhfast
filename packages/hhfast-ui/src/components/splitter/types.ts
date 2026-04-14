import type { CSSProperties, VNode } from 'vue'

/**
 * 分割方向。
 */
export type SplitterOrientation = 'horizontal' | 'vertical'

/**
 * 面板尺寸，支持 px 数值或百分比字符串。
 */
export type SplitterSize = number | string

/**
 * 折叠配置。
 */
export interface SplitterCollapsible {
  /** 向起始方向折叠。 */
  start?: boolean
  /** 向结束方向折叠。 */
  end?: boolean
}

/**
 * Splitter 主组件 Props。
 */
export interface SplitterProps {
  /** 分割方向，默认 'horizontal'。 */
  orientation?: SplitterOrientation
  /** 是否懒渲染（拖拽时不实时更新内容）。 */
  lazy?: boolean
  /** 根元素 class。 */
  class?: string
  /** 根元素 style。 */
  style?: CSSProperties | string
}

/**
 * Splitter 事件。
 */
export interface SplitterEmits {
  /** 面板大小变化时触发。 */
  (e: 'resize', sizes: number[]): void
  /** 拖拽开始时触发。 */
  (e: 'resizeStart', sizes: number[]): void
  /** 拖拽结束时触发。 */
  (e: 'resizeEnd', sizes: number[]): void
}

/**
 * Splitter.Panel Props。
 */
export interface SplitterPanelProps {
  /** 受控大小。 */
  size?: SplitterSize
  /** 初始大小。 */
  defaultSize?: SplitterSize
  /** 最小尺寸。 */
  min?: SplitterSize
  /** 最大尺寸。 */
  max?: SplitterSize
  /** 是否可调整大小，默认 true。 */
  resizable?: boolean
  /** 是否可折叠。 */
  collapsible?: boolean | SplitterCollapsible
}

/**
 * 内部面板状态。
 */
export interface InternalPanelState {
  /** 面板索引。 */
  index: number
  /** 当前大小（百分比 0-100）。 */
  size: number
  /** 最小尺寸（百分比）。 */
  min: number
  /** 最大尺寸（百分比）。 */
  max: number
  /** 是否可调整大小。 */
  resizable: boolean
  /** 折叠配置。 */
  collapsible: SplitterCollapsible
  /** 是否已折叠。 */
  collapsed: boolean
  /** 折叠前的大小（用于恢复）。 */
  sizeBeforeCollapse: number
}
