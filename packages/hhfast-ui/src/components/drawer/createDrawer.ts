import { h } from 'vue'
import {
  closeAllDrawers,
  closeDrawer,
  DRAWER_DEFAULTS,
  openDrawer,
} from './drawerState'
import type {
  DrawerConfirmPayload,
  DrawerContentInput,
  DrawerGlobalDefaults,
  DrawerOpenPayload,
  DrawerShowOptions,
} from './types'

/**
 * 合并工厂默认项与单次 `open` 参数。
 */
function mergeOpenPayload(
  defaults: DrawerGlobalDefaults | undefined,
  partial: DrawerShowOptions & { content: DrawerContentInput },
): DrawerOpenPayload {
  return {
    placement: partial.placement ?? defaults?.placement ?? DRAWER_DEFAULTS.placement,
    width: partial.width ?? defaults?.width ?? DRAWER_DEFAULTS.width,
    height: partial.height ?? defaults?.height ?? DRAWER_DEFAULTS.height,
    maskClosable:
      partial.maskClosable ?? defaults?.maskClosable ?? DRAWER_DEFAULTS.maskClosable,
    closable: partial.closable ?? defaults?.closable ?? DRAWER_DEFAULTS.closable,
    maxStack: partial.maxStack ?? defaults?.maxStack ?? DRAWER_DEFAULTS.maxStack,
    zIndex: partial.zIndex ?? defaults?.zIndex,
    title: partial.title ?? defaults?.title,
    className: partial.className ?? defaults?.className,
    style: partial.style ?? defaults?.style,
    showConfirm: partial.showConfirm ?? defaults?.showConfirm ?? DRAWER_DEFAULTS.showConfirm,
    showCancel: partial.showCancel ?? defaults?.showCancel ?? DRAWER_DEFAULTS.showCancel,
    confirmText: partial.confirmText ?? defaults?.confirmText ?? DRAWER_DEFAULTS.confirmText,
    cancelText: partial.cancelText ?? defaults?.cancelText ?? DRAWER_DEFAULTS.cancelText,
    onConfirm: partial.onConfirm ?? defaults?.onConfirm,
    onCancel: partial.onCancel ?? defaults?.onCancel,
    onClose: partial.onClose ?? defaults?.onClose,
    content: partial.content,
  }
}

/**
 * 命令式 Drawer API。
 */
export interface DrawerApi {
  open: (options: DrawerOpenPayload) => string | undefined
  confirm: <T = any>(options: DrawerConfirmPayload) => Promise<T>
  close: (id: string) => boolean
  closeAll: () => void
}

/**
 * 使用自定义默认项创建 API（仍共享全局 `drawerList`）。
 */
export function createDrawer(defaults?: DrawerGlobalDefaults): DrawerApi {
  return {
    open: (options) => openDrawer(mergeOpenPayload(defaults, options)),

    confirm<T = any>(options: DrawerConfirmPayload): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const content = options.content
          ? options.content
          : () => h('span', options.title ?? '')

        const payload = mergeOpenPayload(defaults, {
          ...options,
          content: content as DrawerContentInput,
          onConfirm: async (values?: any) => {
            try {
              await options.onConfirm?.(values)
              resolve(values as T)
              if (id) closeDrawer(id)
            }
            catch {
              // onConfirm 抛异常时不关闭
            }
          },
          onCancel: async () => {
            await options.onCancel?.()
            if (id) closeDrawer(id)
            reject(new Error('Drawer cancelled'))
          },
          onClose: () => {
            options.onClose?.()
            reject(new Error('Drawer closed'))
          },
        })

        const id = openDrawer(payload)
        if (!id) {
          reject(new Error('Drawer failed to open (SSR or document unavailable)'))
        }
      })
    },

    close: closeDrawer,
    closeAll: closeAllDrawers,
  }
}

/**
 * 库默认单例。
 */
export const drawer = createDrawer()
