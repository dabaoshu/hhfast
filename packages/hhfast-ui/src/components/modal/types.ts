import type { Component, CSSProperties, VNode } from 'vue';

/**
 * `open` 可传入的内容形式（入栈后会规范化为 {@link ModalRecord.content} `VNode`）。
 *
 * - **TSX**：`content: <MyPanel />`（编译为 `VNode`）
 * - **组件**：`content: MyPanel`，内部 `h(MyPanel)`
 * - **工厂**：`content: () => h('div', '...')` 或返回 JSX 的函数
 */
export type ModalContentInput = VNode | Component | (() => VNode);

/**
 * 弹层语义类型（与 toast 的 type 类似），仅作为数据供业务渲染时区分样式。
 */
export type ModalType = 'info' | 'warning' | 'danger' | 'success';

/**
 * 单条弹层在逻辑层保存的数据（业务用 {@link useModal} 订阅后自绘 UI）。
 */
export interface ModalRecord {
  /** 唯一标识 */
  id: string;
  /** 主体内容（`open` 时已将 {@link ModalContentInput} 规范为 `VNode`） */
  content: VNode;
  /** 点击蒙层是否可关闭（由业务在视图层实现） */
  maskClosable: boolean;
  /** 建议 z-index，栈内默认按 `zIndexBase + 序号 * 10` 推算 */
  zIndex: number;
  /** 语义类型 */
  type: ModalType;
  /** 可选标题，便于业务模板直接展示 */
  title?: string;
  className?: string | string[];
  style?: string | CSSProperties;

  // —— 确认 / 取消 ——

  /** 是否显示确认按钮（仅数据，业务自行消费） */
  showConfirm: boolean;
  /** 是否显示取消按钮 */
  showCancel: boolean;
  /** 确认按钮文案 */
  confirmText: string;
  /** 取消按钮文案 */
  cancelText: string;
  /**
   * 确认回调：业务在自绘 UI 中点击确认时应调用 `record.onConfirm?.(values)`。
   * 支持异步——`createMessageModal` 返回的 Promise 会等待此函数完成。
   */
  onConfirm?: (values?: any) => void | Promise<void>;
  /** 取消回调 */
  onCancel?: () => void | Promise<void>;
  /** 任意路径关闭时触发（先于 onCancel） */
  onClose?: () => void;
}

/**
 * `modal.open` / `createModal` 可合并的选项。
 */
export interface ModalShowOptions {
  maskClosable?: boolean;
  maxStack?: number;
  zIndex?: number;
  type?: ModalType;
  title?: string;
  className?: string | string[];
  style?: string | CSSProperties;
  showConfirm?: boolean;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (values?: any) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  onClose?: () => void;
}

/**
 * `open` 必传 `content`（见 {@link ModalContentInput}）。
 */
export type ModalOpenPayload = ModalShowOptions & { content: ModalContentInput };

/**
 * `confirm` 场景的选项——`content` 可选（不传时业务根据 `title` 渲染纯文字确认框）。
 */
export type ModalConfirmPayload = ModalShowOptions & { content?: ModalContentInput };

/**
 * `createModal` 工厂默认项（无 `content`）。
 */
export type ModalGlobalDefaults = ModalShowOptions;

/**
 * 声明式 HModal 的 props。
 */
export interface HModalProps {
  /** 显隐（`v-model`） */
  modelValue: boolean;
  title?: string;
  type?: ModalType;
  maskClosable?: boolean;
  closable?: boolean;
  showConfirm?: boolean;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  /** 确认按钮受控 loading */
  confirmLoading?: boolean;
  zIndex?: number;
  className?: string | string[];
  style?: string | CSSProperties;
}

/**
 * 声明式 HModal 的事件。
 */
export type HModalEmits = {
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
  close: [];
};
