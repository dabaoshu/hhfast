/** Toast 类型与记录结构 */
export type {
  ToastGlobalDefaults,
  ToastPlacement,
  ToastRecord,
  ToastShowOptions,
  ToastType,
} from './types';

/** 单例队列、命令式方法与 {@link useToast}（无内置 UI） */
export {
  clearToasts,
  closeToast,
  pushToast,
  pauseToastTimer,
  resumeToastTimer,
  toastList,
  TOAST_DEFAULTS,
  useToast,
} from './toastState';
export type { PushToastPayload, UseToastReturn } from './toastState';

/** 命令式 API */
export { createToast, toast } from './createToast';
export type { ToastApi } from './createToast';
