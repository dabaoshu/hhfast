/** Modal 类型与记录结构 */
export type {
  HModalEmits,
  HModalProps,
  ModalConfirmPayload,
  ModalContentInput,
  ModalGlobalDefaults,
  ModalOpenPayload,
  ModalRecord,
  ModalShowOptions,
  ModalType,
} from './types';

/** 单例栈、命令式方法与 {@link useModal}（无内置 UI，与 toast 子模块一致） */
export {
  closeAllModals,
  closeModal,
  modalList,
  MODAL_DEFAULTS,
  normalizeModalContent,
  openModal,
  useModal,
} from './modalState';
export type { UseModalReturn } from './modalState';

/** 渲染层交互逻辑 hook */
export { useModalLayer } from './useModalLayer';
export type { UseModalLayerReturn } from './useModalLayer';

/** 命令式 API */
export { createModal, modal } from './createModal';
export type { ModalApi } from './createModal';

/** 声明式通用壳与内置渲染层 */
export { default as HModal } from './HModal.vue';
export { default as HModalLayer } from './HModalLayer.vue';
