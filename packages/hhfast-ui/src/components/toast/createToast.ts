import {
  clearToasts,
  closeToast,
  pushToast,
  TOAST_DEFAULTS,
  type PushToastPayload,
} from './toastState';
import type {
  ToastGlobalDefaults,
  ToastShowOptions,
  ToastType,
} from './types';

/**
 * 合并全局默认项与单次调用参数（后者优先）。
 */
function mergePayload(
  defaults: ToastGlobalDefaults | undefined,
  partial: ToastShowOptions & { message: string },
): PushToastPayload {
  return {
    ...TOAST_DEFAULTS,
    ...defaults,
    ...partial,
  };
}

/**
 * 生成某一 `type` 的快捷方法（success / info / warning / error）。
 */
function createKindCaller(
  defaults: ToastGlobalDefaults | undefined,
  type: ToastType,
) {
  return (message: string, options?: ToastShowOptions) =>
    pushToast(mergePayload(defaults, { ...options, message, type }));
}

/**
 * 命令式 Toast API（与默认 {@link toast} 行为一致，可带工厂默认项）。
 */
export interface ToastApi {
  show: (options: ToastShowOptions & { message: string }) => string | undefined;
  success: (
    message: string,
    options?: ToastShowOptions,
  ) => string | undefined;
  info: (message: string, options?: ToastShowOptions) => string | undefined;
  warning: (
    message: string,
    options?: ToastShowOptions,
  ) => string | undefined;
  error: (message: string, options?: ToastShowOptions) => string | undefined;
  close: (id: string) => boolean;
  clear: () => void;
}

/**
 * 使用自定义默认项创建一组 API（与默认单例共享同一全局队列）。
 *
 * @param defaults - 每次 `show` / 快捷方法都会与单次参数合并
 */
export function createToast(defaults?: ToastGlobalDefaults): ToastApi {
  const kind = (t: ToastType) => createKindCaller(defaults, t);
  return {
    show: (opts) => pushToast(mergePayload(defaults, opts)),
    success: kind('success'),
    info: kind('info'),
    warning: kind('warning'),
    error: kind('error'),
    close: closeToast,
    clear: clearToasts,
  };
}

/**
 * 库默认导出的单例命令式 API。业务需自行基于 {@link useToast} 或订阅 `toastList` 渲染视图。
 */
export const toast = createToast();
