import { reactive, readonly } from 'vue';
import type { ToastPlacement, ToastRecord, ToastShowOptions, ToastType } from './types';

/** 全局默认，供 `pushToast` 与 `createToast` 合并 */
export const TOAST_DEFAULTS: Required<
  Pick<ToastShowOptions, 'type' | 'duration' | 'placement' | 'maxCount' | 'pauseOnHover'>
> = {
  type: 'info',
  duration: 3000,
  placement: 'top',
  maxCount: 5,
  pauseOnHover: false,
};

let idSeq = 0;

function nextId(): string {
  idSeq += 1;
  return `hh-toast-${idSeq}`;
}

/** 当前队列（单例），由 {@link useToast} 对外只读暴露 */
export const toastList = reactive<ToastRecord[]>([]);

const timerById = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(id: string): void {
  const t = timerById.get(id);
  if (t !== undefined) {
    clearTimeout(t);
    timerById.delete(id);
  }
}

function scheduleClose(id: string, duration: number): void {
  clearTimer(id);
  if (duration <= 0) {
    return;
  }
  const t = setTimeout(() => {
    closeToast(id);
  }, duration);
  timerById.set(id, t);
}

function trimOldest(count: number): void {
  if (count <= 0) {
    return;
  }
  const remove = toastList.splice(0, count);
  for (const r of remove) {
    clearTimer(r.id);
  }
}

/**
 * 关闭一条 Toast。
 *
 * @param id - {@link ToastRecord.id}
 * @returns 是否找到并移除
 */
export function closeToast(id: string): boolean {
  clearTimer(id);
  const i = toastList.findIndex((t) => t.id === id);
  if (i === -1) {
    return false;
  }
  toastList.splice(i, 1);
  return true;
}

/** 清空全部 Toast。 */
export function clearToasts(): void {
  for (const id of timerById.keys()) {
    clearTimer(id);
  }
  toastList.splice(0, toastList.length);
}

/** 暂停自动关闭（悬停时调用）。 */
export function pauseToastTimer(id: string): void {
  clearTimer(id);
}

/** 恢复自动关闭（悬停结束，按完整 duration 重新计时）。 */
export function resumeToastTimer(id: string, duration: number): void {
  scheduleClose(id, duration);
}

export interface PushToastPayload extends ToastShowOptions {
  message: string;
}

/**
 * 推入一条 Toast；无浏览器环境时静默不入队。
 *
 * @returns 新建 id，失败时 `undefined`
 */
export function pushToast(payload: PushToastPayload): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const merged: ToastRecord = {
    id: nextId(),
    message: payload.message,
    type: (payload.type ?? TOAST_DEFAULTS.type) as ToastType,
    duration: payload.duration ?? TOAST_DEFAULTS.duration,
    placement: (payload.placement ?? TOAST_DEFAULTS.placement) as ToastPlacement,
    pauseOnHover: payload.pauseOnHover ?? TOAST_DEFAULTS.pauseOnHover,
    icon: payload.icon,
    className: payload.className,
    style: payload.style,
  };

  const maxCount = payload.maxCount ?? TOAST_DEFAULTS.maxCount;
  if (toastList.length >= maxCount) {
    trimOldest(toastList.length - maxCount + 1);
  }

  toastList.push(merged);
  scheduleClose(merged.id, merged.duration);
  return merged.id;
}

// —— 组合式 API ——

/**
 * `useToast` 返回对象类型，便于在组件外声明或扩展。
 */
export interface UseToastReturn {
  /**
   * 当前队列（只读响应式，与全局单例同步）。
   * 实现上为 `readonly(reactive)`，与 {@link ToastRecord} 在部分可选字段上类型略有差异，按只读列表使用即可。
   */
  toastList: Readonly<ToastRecord[]>;
  defaults: typeof TOAST_DEFAULTS;
  pushToast: (payload: PushToastPayload) => string | undefined;
  closeToast: (id: string) => boolean;
  clearToasts: () => void;
  pauseToastTimer: (id: string) => void;
  resumeToastTimer: (id: string, duration: number) => void;
}

/**
 * Toast 全局队列与操作方法（单例）。在 `setup`、`<script setup>` 或 TSX 的 `setup` 中调用。
 *
 * 命令式场景请优先使用 {@link createToast} 返回的 `toast`；在自定义宿主或需订阅列表时使用本 hook。
 */
export function useToast(): UseToastReturn {
  return {
    toastList: readonly(toastList) as Readonly<ToastRecord[]>,
    defaults: TOAST_DEFAULTS,
    pushToast,
    closeToast,
    clearToasts,
    pauseToastTimer,
    resumeToastTimer,
  };
}
