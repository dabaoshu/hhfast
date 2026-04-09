import type { CSSProperties } from 'vue'
import type { TooltipPlacement, TooltipTrigger } from '../tooltip/types'

/**
 * Popover 方位（复用 Tooltip）。
 */
export type PopoverPlacement = TooltipPlacement

/**
 * Popover 触发方式（复用 Tooltip）。
 */
export type PopoverTrigger = TooltipTrigger

/**
 * Popover 组件 Props。
 */
export interface PopoverProps {
  /** 标题文本。 */
  title?: string
  /** 内容文本。 */
  content?: string
  /** 弹出方位，默认 'top'。 */
  placement?: PopoverPlacement
  /** 触发方式，默认 'hover'。 */
  trigger?: PopoverTrigger
  /** 是否禁用。 */
  disabled?: boolean
  /** 距离目标元素的偏移量（px），默认 12。 */
  offset?: number
  /** hover 模式下显示延迟（ms），默认 100。 */
  showDelay?: number
  /** hover 模式下隐藏延迟（ms），默认 100。 */
  hideDelay?: number
  /** 鼠标是否可进入浮层，默认 true。 */
  enterable?: boolean
  /** 最大宽度，默认 320px。 */
  maxWidth?: number | string
  /** 层叠层级。 */
  zIndex?: number
  /** 手动控制显隐（trigger='manual' 时使用）。 */
  visible?: boolean
  /** 过渡动画名称，默认 'hh-popover-fade'。 */
  transition?: string
  /** 自定义浮层 class。 */
  overlayClassName?: string
  /** 自定义浮层样式。 */
  overlayStyle?: CSSProperties
  /** 是否显示箭头，默认 true。 */
  arrow?: boolean
}
