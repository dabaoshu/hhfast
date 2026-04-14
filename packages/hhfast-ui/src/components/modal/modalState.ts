import { h, isVNode, reactive, readonly } from 'vue';
import type { Component, VNode } from 'vue';
import type {
  ModalContentInput,
  ModalOpenPayload,
  ModalRecord,
} from './types';

/**
 * 将 `VNode` / 组件 / `() => VNode` 统一为 `VNode`。
 */
export function normalizeModalContent(input: ModalContentInput): VNode {
  if (isVNode(input)) {
    return input;
  }
  if (typeof input === 'function') {
    const out = (input as () => VNode)();
    if (isVNode(out)) {
      return out;
    }
    return h(input as Component);
  }
  return h(input as Component);
}

/** 与 `openModal` / `createModal` 合并的默认项 */
export const MODAL_DEFAULTS = {
  maskClosable: true,
  maxStack: 20,
  zIndexBase: 1000,
  type: 'info' as const,
  showConfirm: true,
  showCancel: true,
  confirmText: '确定',
  cancelText: '取消',
};

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `hh-modal-${idSeq}`;
}

/** 当前弹层栈（底 → 顶），由 {@link useModal} 只读暴露 */
export const modalList = reactive<ModalRecord[]>([]);

function computeZIndex(payload: ModalOpenPayload): number {
  if (payload.zIndex != null) {
    return payload.zIndex;
  }
  return MODAL_DEFAULTS.zIndexBase + modalList.length * 10;
}

/**
 * 打开一层弹层；无浏览器环境时返回 `undefined`。
 *
 * @returns 新建 id
 */
export function openModal(payload: ModalOpenPayload): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const maxStack = payload.maxStack ?? MODAL_DEFAULTS.maxStack;
  while (modalList.length >= maxStack && modalList.length > 0) {
    closeModal(modalList[0].id);
  }

  const record: ModalRecord = {
    id: nextId(),
    content: normalizeModalContent(payload.content),
    maskClosable: payload.maskClosable ?? MODAL_DEFAULTS.maskClosable,
    zIndex: computeZIndex(payload),
    type: payload.type ?? MODAL_DEFAULTS.type,
    title: payload.title,
    className: payload.className,
    style: payload.style,
    showConfirm: payload.showConfirm ?? MODAL_DEFAULTS.showConfirm,
    showCancel: payload.showCancel ?? MODAL_DEFAULTS.showCancel,
    confirmText: payload.confirmText ?? MODAL_DEFAULTS.confirmText,
    cancelText: payload.cancelText ?? MODAL_DEFAULTS.cancelText,
    onConfirm: payload.onConfirm,
    onCancel: payload.onCancel,
    onClose: payload.onClose,
  };

  modalList.push(record);
  return record.id;
}

/**
 * 按 id 关闭一层：先从栈中移除，再调用 `onClose`。
 *
 * @returns 是否找到并关闭
 */
export function closeModal(id: string): boolean {
  const i = modalList.findIndex((m) => m.id === id);
  if (i === -1) {
    return false;
  }
  const [removed] = modalList.splice(i, 1);
  removed?.onClose?.();
  return true;
}

/** 自下而上依次关闭并触发各自 `onClose`。 */
export function closeAllModals(): void {
  const ids = modalList.map((m) => m.id);
  for (const id of ids) {
    closeModal(id);
  }
}

// —— 组合式 API ——

/** `useModal` 返回类型。 */
export interface UseModalReturn {
  modalList: Readonly<ModalRecord[]>;
  defaults: typeof MODAL_DEFAULTS;
  openModal: (payload: ModalOpenPayload) => string | undefined;
  closeModal: (id: string) => boolean;
  closeAllModals: () => void;
}

/**
 * 全局弹层栈与操作（单例）。业务在自绘 `Teleport` 中订阅 `modalList`。
 */
export function useModal(): UseModalReturn {
  return {
    modalList: readonly(modalList) as Readonly<ModalRecord[]>,
    defaults: MODAL_DEFAULTS,
    openModal,
    closeModal,
    closeAllModals,
  };
}
