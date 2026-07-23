import { h, isVNode, reactive, readonly } from 'vue'
import type { Component, VNode } from 'vue'
import type {
  DrawerContentInput,
  DrawerOpenPayload,
  DrawerRecord,
} from './types'

/**
 * 将 `VNode` / 组件 / `() => VNode` 统一为 `VNode`。
 */
export function normalizeDrawerContent(input: DrawerContentInput): VNode {
  if (isVNode(input)) {
    return input
  }
  if (typeof input === 'function') {
    const out = (input as () => VNode)()
    if (isVNode(out)) {
      return out
    }
    return h(input as Component)
  }
  return h(input as Component)
}

/** 与 `openDrawer` / `createDrawer` 合并的默认项 */
export const DRAWER_DEFAULTS = {
  placement: 'right' as const,
  width: 360 as string | number,
  height: 360 as string | number,
  maskClosable: true,
  closable: true,
  maxStack: 20,
  zIndexBase: 1100,
  showConfirm: true,
  showCancel: true,
  confirmText: '确定',
  cancelText: '取消',
}

let idSeq = 0

function nextId(): string {
  idSeq += 1
  return `hh-drawer-${idSeq}`
}

/** 当前抽屉栈（底 → 顶） */
export const drawerList = reactive<DrawerRecord[]>([])

function computeZIndex(payload: DrawerOpenPayload): number {
  if (payload.zIndex != null) {
    return payload.zIndex
  }
  return DRAWER_DEFAULTS.zIndexBase + drawerList.length * 10
}

/**
 * 打开一层抽屉；无浏览器环境时返回 `undefined`。
 */
export function openDrawer(payload: DrawerOpenPayload): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }

  const maxStack = payload.maxStack ?? DRAWER_DEFAULTS.maxStack
  while (drawerList.length >= maxStack && drawerList.length > 0) {
    closeDrawer(drawerList[0].id)
  }

  const record: DrawerRecord = {
    id: nextId(),
    content: normalizeDrawerContent(payload.content),
    placement: payload.placement ?? DRAWER_DEFAULTS.placement,
    width: payload.width ?? DRAWER_DEFAULTS.width,
    height: payload.height ?? DRAWER_DEFAULTS.height,
    maskClosable: payload.maskClosable ?? DRAWER_DEFAULTS.maskClosable,
    closable: payload.closable ?? DRAWER_DEFAULTS.closable,
    zIndex: computeZIndex(payload),
    title: payload.title,
    className: payload.className,
    style: payload.style,
    showConfirm: payload.showConfirm ?? DRAWER_DEFAULTS.showConfirm,
    showCancel: payload.showCancel ?? DRAWER_DEFAULTS.showCancel,
    confirmText: payload.confirmText ?? DRAWER_DEFAULTS.confirmText,
    cancelText: payload.cancelText ?? DRAWER_DEFAULTS.cancelText,
    onConfirm: payload.onConfirm,
    onCancel: payload.onCancel,
    onClose: payload.onClose,
  }

  drawerList.push(record)
  return record.id
}

/**
 * 按 id 关闭一层。
 */
export function closeDrawer(id: string): boolean {
  const i = drawerList.findIndex((m) => m.id === id)
  if (i === -1) {
    return false
  }
  const [removed] = drawerList.splice(i, 1)
  removed?.onClose?.()
  return true
}

/** 自下而上依次关闭。 */
export function closeAllDrawers(): void {
  const ids = drawerList.map((m) => m.id)
  for (const id of ids) {
    closeDrawer(id)
  }
}

/** `useDrawer` 返回类型。 */
export interface UseDrawerReturn {
  drawerList: Readonly<DrawerRecord[]>
  defaults: typeof DRAWER_DEFAULTS
  openDrawer: (payload: DrawerOpenPayload) => string | undefined
  closeDrawer: (id: string) => boolean
  closeAllDrawers: () => void
}

/**
 * 全局抽屉栈与操作（单例）。
 */
export function useDrawer(): UseDrawerReturn {
  return {
    drawerList: readonly(drawerList) as Readonly<DrawerRecord[]>,
    defaults: DRAWER_DEFAULTS,
    openDrawer,
    closeDrawer,
    closeAllDrawers,
  }
}
