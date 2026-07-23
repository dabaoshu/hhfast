<script setup lang="ts">
/**
 * @description 全局配置提供者，统一挂载 Toast / Modal / Drawer 渲染层并覆盖默认配置。
 *
 * @example
 * ```vue
 * <HConfigProvider :toast="{ duration: 5000 }" :modal="{ confirmText: 'OK' }" :drawer="{ placement: 'left' }">
 *   <RouterView />
 * </HConfigProvider>
 * ```
 */
import { computed, provide, watchEffect, onUnmounted } from 'vue'
import { TOAST_DEFAULTS } from '../toast/toastState'
import { MODAL_DEFAULTS } from '../modal/modalState'
import { DRAWER_DEFAULTS } from '../drawer/drawerState'
import HToastLayer from '../toast/HToastLayer'
import HModalLayer from '../modal/HModalLayer.vue'
import HDrawerLayer from '../drawer/HDrawerLayer.vue'
import { HH_CONFIG_KEY } from './types'
import type { HConfigProviderProps, HhConfig } from './types'

defineOptions({ name: 'HConfigProvider' })

const props = withDefaults(defineProps<HConfigProviderProps>(), {
  toast: undefined,
  modal: undefined,
  drawer: undefined,
})

const toastSnapshot = { ...TOAST_DEFAULTS }
const modalSnapshot = { ...MODAL_DEFAULTS }
const drawerSnapshot = { ...DRAWER_DEFAULTS }

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

watchEffect(() => {
  const d = props.drawer
  if (d && d !== false) {
    Object.assign(DRAWER_DEFAULTS, drawerSnapshot, d)
  }
})

onUnmounted(() => {
  Object.assign(TOAST_DEFAULTS, toastSnapshot)
  Object.assign(MODAL_DEFAULTS, modalSnapshot)
  Object.assign(DRAWER_DEFAULTS, drawerSnapshot)
})

const showToast = computed(() => props.toast !== false)
const showModal = computed(() => props.modal !== false)
const showDrawer = computed(() => props.drawer !== false)

const config: HhConfig = {
  toast: computed(() => props.toast),
  modal: computed(() => props.modal),
  drawer: computed(() => props.drawer),
}
provide(HH_CONFIG_KEY, config)
</script>

<template>
  <HToastLayer v-if="showToast" />
  <HModalLayer v-if="showModal" />
  <HDrawerLayer v-if="showDrawer" />
  <slot />
</template>
