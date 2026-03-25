import type { App, Plugin } from 'vue'

export {
  toast,
  createToast,
  useToast,
} from './components/toast'

export {
  modal,
  createModal,
  useModal,
  useModalLayer,
  openModal,
  closeModal,
  closeAllModals,
  modalList,
  MODAL_DEFAULTS,
  normalizeModalContent,
} from './components/modal'

export type {
  ToastApi,
  ToastType,
  ToastPlacement,
  ToastRecord,
  ToastShowOptions,
  ToastGlobalDefaults,
  UseToastReturn,
  PushToastPayload,
} from './components/toast'

export type {
  ModalApi,
  ModalRecord,
  ModalShowOptions,
  ModalOpenPayload,
  ModalConfirmPayload,
  ModalContentInput,
  ModalType,
  ModalGlobalDefaults,
  UseModalReturn,
  UseModalLayerReturn,
} from './components/modal'

/**
 * 全量注册占位：Toast / Modal 均为纯逻辑；后续若有需全局注册的组件可写在此处。
 */
export const HhfastUi: Plugin = {
  install(_app: App) {},
}

export default HhfastUi
