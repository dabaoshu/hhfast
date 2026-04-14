import { ref } from 'vue';
import type { Ref } from 'vue';
import type { ModalRecord } from './types';
import { modalList, closeModal, closeAllModals, MODAL_DEFAULTS } from './modalState';
import { readonly } from 'vue';

/**
 * `useModalLayer` 返回类型。
 */
export interface UseModalLayerReturn {
  /** 只读弹层栈（底 → 顶） */
  modalList: Readonly<ModalRecord[]>;
  /** 各弹层的异步 loading 状态，key 为 record.id */
  loadingMap: Ref<Record<string, boolean>>;
  /** 默认配置 */
  defaults: typeof MODAL_DEFAULTS;
  /**
   * 确认操作：有 `onConfirm` 时执行并追踪 loading，无则直接关闭。
   * @param record - 当前弹层记录
   * @param values - 透传给 `record.onConfirm` 的参数
   */
  handleConfirm: (record: ModalRecord, values?: any) => Promise<void>;
  /**
   * 取消操作：有 `onCancel` 时执行回调，无则直接关闭。
   */
  handleCancel: (record: ModalRecord) => void;
  /**
   * 蒙层点击：仅 `maskClosable` 为 true 时触发 cancel 逻辑。
   */
  handleMaskClick: (record: ModalRecord) => void;
  closeModal: (id: string) => boolean;
  closeAllModals: () => void;
}

/**
 * 为业务自绘 Modal 渲染层提供开箱即用的交互逻辑。
 *
 * 封装了确认（含异步 loading）、取消、蒙层点击的统一处理，
 * 业务只需关注模板与样式。
 *
 * @example
 * ```vue
 * <script setup>
 * import { useModalLayer } from '@/components/modal'
 * const { modalList, loadingMap, handleConfirm, handleCancel, handleMaskClick } = useModalLayer()
 * </script>
 * ```
 */
export function useModalLayer(): UseModalLayerReturn {
  const loadingMap = ref<Record<string, boolean>>({});

  async function handleConfirm(record: ModalRecord, values?: any): Promise<void> {
    if (!record.onConfirm) {
      closeModal(record.id);
      return;
    }
    loadingMap.value[record.id] = true;
    try {
      await record.onConfirm(values);
    } finally {
      loadingMap.value[record.id] = false;
    }
  }

  function handleCancel(record: ModalRecord): void {
    if (record.onCancel) {
      record.onCancel();
    } else {
      closeModal(record.id);
    }
  }

  function handleMaskClick(record: ModalRecord): void {
    if (record.maskClosable) {
      handleCancel(record);
    }
  }

  return {
    modalList: readonly(modalList) as Readonly<ModalRecord[]>,
    loadingMap,
    defaults: MODAL_DEFAULTS,
    handleConfirm,
    handleCancel,
    handleMaskClick,
    closeModal,
    closeAllModals,
  };
}
