import type { Component, CSSProperties, VNode } from 'vue'

/**
 * 抽屉滑出方向。
 */
export type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'

/**
 * `open` 可传入的内容形式（入栈后规范为 {@link DrawerRecord.content}）。
 */
export type DrawerContentInput = VNode | Component | (() => VNode)

/**
 * 单条抽屉在逻辑层保存的数据。
 */
export interface DrawerRecord {
  /** 唯一标识 */
  id: string
  /** 主体内容 */
  content: VNode
  /** 滑出方向 */
  placement: DrawerPlacement
  /** 左右方向宽度 */
  width: string | number
  /** 上下方向高度 */
  height: string | number
  /** 点击蒙层是否可关闭 */
  maskClosable: boolean
  /** 是否显示关闭按钮 */
  closable: boolean
  /** 建议 z-index */
  zIndex: number
  /** 可选标题 */
  title?: string
  className?: string | string[]
  style?: string | CSSProperties
  showConfirm: boolean
  showCancel: boolean
  confirmText: string
  cancelText: string
  onConfirm?: (values?: any) => void | Promise<void>
  onCancel?: () => void | Promise<void>
  onClose?: () => void
}

/**
 * `drawer.open` / `createDrawer` 可合并的选项。
 */
export interface DrawerShowOptions {
  placement?: DrawerPlacement
  width?: string | number
  height?: string | number
  maskClosable?: boolean
  closable?: boolean
  maxStack?: number
  zIndex?: number
  title?: string
  className?: string | string[]
  style?: string | CSSProperties
  showConfirm?: boolean
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  onConfirm?: (values?: any) => void | Promise<void>
  onCancel?: () => void | Promise<void>
  onClose?: () => void
}

/**
 * `open` 必传 `content`。
 */
export type DrawerOpenPayload = DrawerShowOptions & { content: DrawerContentInput }

/**
 * `confirm` 场景——`content` 可选。
 */
export type DrawerConfirmPayload = DrawerShowOptions & { content?: DrawerContentInput }

/**
 * `createDrawer` 工厂默认项。
 */
export type DrawerGlobalDefaults = DrawerShowOptions

/**
 * 声明式 {@link HDrawer} 的 props。
 */
export interface DrawerProps {
  open: boolean
  placement?: DrawerPlacement
  title?: string
  closable?: boolean
  maskClosable?: boolean
  width?: string | number
  height?: string | number
  showConfirm?: boolean
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  confirmLoading?: boolean
  zIndex?: number
  className?: string | string[]
}

/**
 * 声明式 HDrawer 的事件。
 */
export type HDrawerEmits = {
  'update:open': [value: boolean]
  confirm: []
  cancel: []
  close: []
  afterLeave: []
}
