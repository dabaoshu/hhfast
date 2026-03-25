import {
  closeAllModals,
  closeModal,
  MODAL_DEFAULTS,
  openModal,
} from './modalState';
import type {
  ModalConfirmPayload,
  ModalContentInput,
  ModalGlobalDefaults,
  ModalOpenPayload,
  ModalShowOptions,
} from './types';
import { h } from 'vue';

/**
 * 合并工厂默认项与单次 `open` 参数。
 */
function mergeOpenPayload(
  defaults: ModalGlobalDefaults | undefined,
  partial: ModalShowOptions & { content: ModalContentInput },
): ModalOpenPayload {
  return {
    maskClosable:
      partial.maskClosable ??
      defaults?.maskClosable ??
      MODAL_DEFAULTS.maskClosable,
    maxStack: partial.maxStack ?? defaults?.maxStack ?? MODAL_DEFAULTS.maxStack,
    zIndex: partial.zIndex ?? defaults?.zIndex,
    type: partial.type ?? defaults?.type ?? MODAL_DEFAULTS.type,
    title: partial.title ?? defaults?.title,
    className: partial.className ?? defaults?.className,
    style: partial.style ?? defaults?.style,
    showConfirm: partial.showConfirm ?? defaults?.showConfirm ?? MODAL_DEFAULTS.showConfirm,
    showCancel: partial.showCancel ?? defaults?.showCancel ?? MODAL_DEFAULTS.showCancel,
    confirmText: partial.confirmText ?? defaults?.confirmText ?? MODAL_DEFAULTS.confirmText,
    cancelText: partial.cancelText ?? defaults?.cancelText ?? MODAL_DEFAULTS.cancelText,
    onConfirm: partial.onConfirm ?? defaults?.onConfirm,
    onCancel: partial.onCancel ?? defaults?.onCancel,
    onClose: partial.onClose ?? defaults?.onClose,
    content: partial.content,
  };
}

/**
 * 命令式 Modal API。
 */
export interface ModalApi {
  /** 入栈一层，返回 id */
  open: (options: ModalOpenPayload) => string | undefined;
  /**
   * 确认弹窗（Promise 风格）。
   *
   * - resolve：用户点确认时触发（支持 `onConfirm` 异步）
   * - reject：用户点取消或关闭蒙层
   *
   * 参考 `messageConfirm/createPortaModal`，但只处理逻辑，不创建 UI。
   * 业务在订阅 `modalList` 后自绘 UI，
   * 点击确认时调用 `record.onConfirm(values)`，点击取消时调用 `record.onCancel()`。
   *
   * @example
   * ```ts
   * try {
   *   const values = await modal.confirm({
   *     title: '确认删除？',
   *     content: <MyConfirmPanel />,
   *   });
   *   // 用户确认，values 可选
   * } catch {
   *   // 用户取消
   * }
   * ```
   */
  confirm: <T = any>(options: ModalConfirmPayload) => Promise<T>;
  close: (id: string) => boolean;
  closeAll: () => void;
}

/**
 * 使用自定义默认项创建 API（仍共享全局 `modalList`）。
 *
 * @param defaults - 每次 `open` 时与单次参数合并
 */
export function createModal(defaults?: ModalGlobalDefaults): ModalApi {
  return {
    open: (options) => openModal(mergeOpenPayload(defaults, options)),

    confirm<T = any>(options: ModalConfirmPayload): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const content = options.content
          ? options.content
          : () => h('span', options.title ?? '');

        const payload = mergeOpenPayload(defaults, {
          ...options,
          content: content as ModalContentInput,
          onConfirm: async (values?: any) => {
            try {
              await options.onConfirm?.(values);
              resolve(values as T);
              if (id) closeModal(id);
            } catch (err) {
              // onConfirm 抛异常时不关闭，业务自行处理
            }
          },
          onCancel: async () => {
            await options.onCancel?.();
            if (id) closeModal(id);
            reject(new Error('Modal cancelled'));
          },
          onClose: () => {
            options.onClose?.();
            reject(new Error('Modal closed'));
          },
        });

        const id = openModal(payload);
        if (!id) {
          reject(new Error('Modal failed to open (SSR or document unavailable)'));
        }
      });
    },

    close: closeModal,
    closeAll: closeAllModals,
  };
}

/**
 * 库默认单例。
 */
export const modal = createModal();
