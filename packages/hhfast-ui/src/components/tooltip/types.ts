/**
 * Tooltip 方位。
 */
export type TooltipPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'

/**
 * Tooltip 触发方式。
 */
export type TooltipTrigger = 'hover' | 'focus' | 'click' | 'manual'

/**
 * Tooltip 组件 Props。
 */
export interface TooltipProps {
  /** 提示内容。 */
  content?: string
  /** 弹出方位，默认 'top'。 */
  placement?: TooltipPlacement
  /** 触发方式，默认 'hover'。 */
  trigger?: TooltipTrigger
  /** 是否禁用。 */
  disabled?: boolean
  /** 距离目标元素的偏移量（px），默认 8。 */
  offset?: number
  /** hover 模式下显示延迟（ms），默认 100。 */
  showDelay?: number
  /** hover 模式下隐藏延迟（ms），默认 100。 */
  hideDelay?: number
  /** 鼠标是否可进入 tooltip 浮层，默认 true。 */
  enterable?: boolean
  /** 最大宽度。 */
  maxWidth?: number | string
  /** 层叠层级。 */
  zIndex?: number
  /** 手动控制显隐（trigger='manual' 时使用）。 */
  visible?: boolean
  /** 过渡动画名称，默认 'hh-tooltip-fade'。 */
  transition?: string
}

/**
 * v-tooltip 指令绑定值。
 */
export type TooltipDirectiveValue = string | TooltipDirectiveOptions

/**
 * v-tooltip 指令完整配置。
 */
export interface TooltipDirectiveOptions {
  /** 提示内容。 */
  content: string
  /** 弹出方位。 */
  placement?: TooltipPlacement
  /** 触发方式。 */
  trigger?: TooltipTrigger
  /** 是否禁用。 */
  disabled?: boolean
  /** 偏移量。 */
  offset?: number
  /** 显示延迟。 */
  showDelay?: number
  /** 隐藏延迟。 */
  hideDelay?: number
  /** 鼠标是否可进入。 */
  enterable?: boolean
  /** 最大宽度。 */
  maxWidth?: number | string
}
