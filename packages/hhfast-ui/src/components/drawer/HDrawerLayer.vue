<script setup lang="ts">
/**
 * @description Drawer 逻辑栈的内置渲染层：每层复用 HDrawer。
 */
import { reactive } from 'vue'
import type { DrawerRecord } from './types'
import HDrawer from './HDrawer.vue'
import { useDrawerLayer } from './useDrawerLayer'

defineOptions({ name: 'HDrawerLayer' })

const { drawerList, loadingMap, handleConfirm, handleCancel } = useDrawerLayer()

/** 正在播离场动画的抽屉 id */
const leavingIds = reactive(new Set<string>())

/**
 * 开始关闭：先置为不可见以触发 Transition。
 */
function beginClose(item: DrawerRecord): void {
  leavingIds.add(item.id)
}

/**
 * 离场结束：执行取消/出栈逻辑。
 */
function finishClose(item: DrawerRecord): void {
  if (!leavingIds.has(item.id)) return
  leavingIds.delete(item.id)
  handleCancel(item)
}
</script>

<template>
  <HDrawer
    v-for="item in drawerList"
    :key="item.id"
    :open="!leavingIds.has(item.id)"
    :placement="item.placement"
    :title="item.title"
    :closable="item.closable"
    :mask-closable="item.maskClosable"
    :width="item.width"
    :height="item.height"
    :show-confirm="item.showConfirm"
    :show-cancel="item.showCancel"
    :confirm-text="item.confirmText"
    :cancel-text="item.cancelText"
    :confirm-loading="!!loadingMap[item.id]"
    :z-index="item.zIndex"
    :class-name="item.className"
    :style="item.style"
    @confirm="handleConfirm(item)"
    @cancel="beginClose(item)"
    @after-leave="finishClose(item)"
  >
    <component :is="() => item.content" />
  </HDrawer>
</template>
