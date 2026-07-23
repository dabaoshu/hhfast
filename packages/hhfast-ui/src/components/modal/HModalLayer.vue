<script setup lang="ts">
/**
 * @description Modal 逻辑栈的内置渲染层：每层复用 HModal。
 * 关闭时先播离场动画，再调用 handleCancel 出栈。
 */
import { reactive } from 'vue'
import type { ModalRecord } from './types'
import HModal from './HModal.vue'
import { useModalLayer } from './useModalLayer'

defineOptions({ name: 'HModalLayer' })

const { modalList, loadingMap, handleConfirm, handleCancel } = useModalLayer()

/** 正在播离场动画的弹层 id */
const leavingIds = reactive(new Set<string>())

/**
 * 开始关闭：先置为不可见以触发 Transition，待 afterLeave 再出栈。
 */
function beginClose(item: ModalRecord): void {
  leavingIds.add(item.id)
}

/**
 * 离场结束：执行取消/出栈逻辑并清理标记。
 */
function finishClose(item: ModalRecord): void {
  if (!leavingIds.has(item.id)) return
  leavingIds.delete(item.id)
  handleCancel(item)
}
</script>

<template>
  <HModal
    v-for="item in modalList"
    :key="item.id"
    :model-value="!leavingIds.has(item.id)"
    :title="item.title"
    :type="item.type"
    :mask-closable="item.maskClosable"
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
  </HModal>
</template>
