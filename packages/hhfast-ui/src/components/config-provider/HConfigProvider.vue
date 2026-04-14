<script setup lang="ts">
/**
 * @description 全局配置提供者，统一挂载 Toast / Modal 渲染层并覆盖默认配置。
 *
 * @example
 * ```vue
 * <HConfigProvider :toast="{ duration: 5000 }" :modal="{ confirmText: 'OK' }">
 *   <RouterView />
 * </HConfigProvider>
 * ```
 */
import { computed, provide, watchEffect, onUnmounted } from 'vue'
import { TOAST_DEFAULTS } from '../toast/toastState'
import { MODAL_DEFAULTS } from '../modal/modalState'
import HToastLayer from '../toast/HToastLayer'
import HModalLayer from '../modal/HModalLayer.vue'
import { HH_CONFIG_KEY } from './types'
import type { HConfigProviderProps, HhConfig } from './types'

defineOptions({ name: 'HConfigProvider' })

const props = withDefaults(defineProps<HConfigProviderProps>(), {
  toast: undefined,
  modal: undefined,
})

const toastSnapshot = { ...TOAST_DEFAULTS }
const modalSnapshot = { ...MODAL_DEFAULTS }

watchEffect(() => {
  const t = props.toast
  if (t && t !== false) {
    Object.assign(TOAST_DEFAULTS, toastSnapshot, t)
  }
})

watchEffect(() => {
  const m = props.modal
  if (m && m !== false) {
    Object.assign(MODAL_DEFAULTS, modalSnapshot, m)
  }
})

onUnmounted(() => {
  Object.assign(TOAST_DEFAULTS, toastSnapshot)
  Object.assign(MODAL_DEFAULTS, modalSnapshot)
})

const showToast = computed(() => props.toast !== false)
const showModal = computed(() => props.modal !== false)

const config: HhConfig = {
  toast: computed(() => props.toast),
  modal: computed(() => props.modal),
}
provide(HH_CONFIG_KEY, config)
</script>

<template>
  <HToastLayer v-if="showToast" />
  <HModalLayer v-if="showModal" />
  <slot />
</template>
