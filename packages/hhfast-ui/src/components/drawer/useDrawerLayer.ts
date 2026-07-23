import { ref, readonly } from 'vue'
import type { Ref } from 'vue'
import type { DrawerRecord } from './types'
import {
  drawerList,
  closeDrawer,
  closeAllDrawers,
  DRAWER_DEFAULTS,
} from './drawerState'

/**
 * `useDrawerLayer` 返回类型。
 */
export interface UseDrawerLayerReturn {
  drawerList: Readonly<DrawerRecord[]>
  loadingMap: Ref<Record<string, boolean>>
  defaults: typeof DRAWER_DEFAULTS
  handleConfirm: (record: DrawerRecord, values?: any) => Promise<void>
  handleCancel: (record: DrawerRecord) => void
  handleMaskClick: (record: DrawerRecord) => void
  closeDrawer: (id: string) => boolean
  closeAllDrawers: () => void
}

/**
 * 为 Drawer 渲染层提供确认 / 取消 / 蒙层交互。
 */
export function useDrawerLayer(): UseDrawerLayerReturn {
  const loadingMap = ref<Record<string, boolean>>({})

  async function handleConfirm(record: DrawerRecord, values?: any): Promise<void> {
    if (!record.onConfirm) {
      closeDrawer(record.id)
      return
    }
    loadingMap.value[record.id] = true
    try {
      await record.onConfirm(values)
    }
    finally {
      loadingMap.value[record.id] = false
    }
  }

  function handleCancel(record: DrawerRecord): void {
    if (record.onCancel) {
      record.onCancel()
    }
    else {
      closeDrawer(record.id)
    }
  }

  function handleMaskClick(record: DrawerRecord): void {
    if (record.maskClosable) {
      handleCancel(record)
    }
  }

  return {
    drawerList: readonly(drawerList) as Readonly<DrawerRecord[]>,
    loadingMap,
    defaults: DRAWER_DEFAULTS,
    handleConfirm,
    handleCancel,
    handleMaskClick,
    closeDrawer,
    closeAllDrawers,
  }
}
