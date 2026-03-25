import type { CSSProperties, VNode } from 'vue';

/**
 * Toast 语义类型，影响样式与无障碍角色。
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * 弹出位置（与容器区域一一对应）。
 */
export type ToastPlacement = 'top' | 'top-right' | 'bottom';

/**
 * 单条展示所需字段（由 `show` 合并默认项后写入列表）。
 */
export interface ToastRecord {
  /** 唯一标识，用于关闭与定时器 */
  id: string;
  /** 文案 */
  message: string;
  type: ToastType;
  duration: number;
  placement: ToastPlacement;
  pauseOnHover: boolean;
  /** 可选前置图标（VNode），避免与 icon 子模块循环依赖 */
  icon?: VNode;
  /** 追加在单条根节点上的类名（与 `hh-toast__item` 等并存） */
  className?: string | string[];
  /** 单条根节点行内样式 */
  style?: string | CSSProperties;
}

/**
 * `toast.show` / `createToast` 可传入的选项（`message` 在快捷方法中单独传入）。
 */
export interface ToastShowOptions {
  type?: ToastType;
  duration?: number;
  placement?: ToastPlacement;
  /** 列表上限，超出时移除最旧一条 */
  maxCount?: number;
  pauseOnHover?: boolean;
  icon?: VNode;
  className?: string | string[];
  style?: string | CSSProperties;
}

/**
 * `createToast` 工厂接受的默认项（与 {@link ToastShowOptions} 一致，无 `message`）。
 */
export type ToastGlobalDefaults = ToastShowOptions;
