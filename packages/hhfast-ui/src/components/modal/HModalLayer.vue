<script setup lang="ts">
/**
 * @description Modal 逻辑栈的内置渲染层：每层复用 HModal。
 *
 * 直接在根组件挂载即可获得开箱即用的弹层 UI：
 * ```vue
 * <template>
 *   <HModalLayer />
 *   <RouterView />
 * </template>
 * ```
 */
import HModal from './HModal.vue'
import { useModalLayer } from './useModalLayer'

defineOptions({ name: 'HModalLayer' })

const { modalList, loadingMap, handleConfirm, handleCancel } = useModalLayer()
</script>

<template>
  <HModal
    v-for="item in modalList"
    :key="item.id"
    :model-value="true"
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
    @cancel="handleCancel(item)"
  >
    <component :is="() => item.content" />
  </HModal>
</template>
