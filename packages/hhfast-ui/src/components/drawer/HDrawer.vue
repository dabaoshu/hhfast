<script setup lang="ts">
/**
 * @description 声明式抽屉壳：v-model:open，不入全局 drawer 栈。
 * 可选内置确认/取消 footer；供 HDrawerLayer 复用。
 * 进出场按 placement 从对应边滑入/滑出，蒙层同步淡入淡出。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { DrawerPlacement } from './types'
import {
  isTopHDrawerInstance,
  registerHDrawerInstance,
  unregisterHDrawerInstance,
} from './hDrawerRegistry'

defineOptions({ name: 'HDrawer' })

const props = withDefaults(
  defineProps<{
    open: boolean
    placement?: DrawerPlacement
    title?: string
    closable?: boolean
    maskClosable?: boolean
    width?: string | number
    height?: string | number
    showConfirm?: boolean
    showCancel?: boolean
    confirmText?: string
    cancelText?: string
    confirmLoading?: boolean
    zIndex?: number
    className?: string | string[]
    style?: string | CSSProperties
  }>(),
  {
    placement: 'right',
    title: '',
    closable: true,
    maskClosable: true,
    width: 360,
    height: 360,
    showConfirm: false,
    showCancel: false,
    confirmText: '确定',
    cancelText: '取消',
    confirmLoading: false,
    zIndex: 1100,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
  close: []
  afterLeave: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const titleId = `hh-drawer-title-${Math.random().toString(36).slice(2)}`
let previouslyFocused: HTMLElement | null = null
let registryId: symbol | null = null

/** Transition 名称随 placement 变化，确保进出场方向一致 */
const transitionName = computed(() => `hh-drawer-${props.placement}`)

const panelClass = computed(() => [
  'hh-drawer-panel',
  `hh-drawer--${props.placement}`,
  props.className,
])

const drawerStyle = computed(() => {
  const sizeStyle =
    props.placement === 'left' || props.placement === 'right'
      ? {
          width: typeof props.width === 'number' ? `${props.width}px` : props.width,
          maxWidth: '100vw',
        }
      : {
          height: typeof props.height === 'number' ? `${props.height}px` : props.height,
          maxHeight: '100vh',
        }
  if (!props.style) return sizeStyle
  if (typeof props.style === 'string') return [props.style, sizeStyle]
  return { ...sizeStyle, ...props.style }
})

/**
 * 收集 panel 内可聚焦元素。
 */
function getFocusable(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(panelRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ))
}

/**
 * 关闭：cancel → close → 更新 v-model。
 */
function requestClose(): void {
  emit('cancel')
  emit('close')
  emit('update:open', false)
}

/**
 * 确认：仅抛事件。
 */
function handleConfirm(): void {
  emit('confirm')
}

function onMaskClick(): void {
  if (props.maskClosable) requestClose()
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open || !registryId || !isTopHDrawerInstance(registryId)) return
  if (event.key === 'Escape' && props.closable) {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab') return
  const focusable = getFocusable()
  const first = focusable[0] ?? panelRef.value
  const last = focusable[focusable.length - 1] ?? panelRef.value
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

/**
 * 离场结束：通知父级后还原焦点。
 */
function onAfterLeave(): void {
  if (registryId) {
    unregisterHDrawerInstance(registryId)
    registryId = null
  }
  document.removeEventListener('keydown', onKeydown)
  const toRestore = previouslyFocused
  previouslyFocused = null
  emit('afterLeave')
  void nextTick(() => toRestore?.focus())
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      registryId = registerHDrawerInstance(props.zIndex)
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      ;(getFocusable()[0] ?? panelRef.value)?.focus()
    }
    else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

watch(
  () => props.zIndex,
  (zIndex) => {
    if (!props.open || !registryId) return
    unregisterHDrawerInstance(registryId)
    registryId = registerHDrawerInstance(zIndex)
  },
)

onBeforeUnmount(() => {
  if (registryId) {
    unregisterHDrawerInstance(registryId)
    registryId = null
  }
  document.removeEventListener('keydown', onKeydown)
  previouslyFocused?.focus()
  previouslyFocused = null
})
</script>

<template>
  <Teleport to="body">
    <!--
      单一 Transition，name 随 placement 变化：
      蒙层淡入淡出 + 面板从对应边滑入/滑出（关闭时方向与打开一致）。
    -->
    <Transition :name="transitionName" @after-leave="onAfterLeave">
      <div
        v-if="open"
        class="hh-drawer-mask"
        :style="{ zIndex }"
        @click.self="onMaskClick"
      >
        <aside
          ref="panelRef"
          :class="panelClass"
          :style="drawerStyle"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title || $slots.header ? titleId : undefined"
          tabindex="-1"
        >
          <header
            v-if="title || $slots.header || closable"
            class="hh-drawer-header"
          >
            <slot name="header">
              <span :id="titleId" class="hh-drawer-title">{{ title }}</span>
            </slot>
            <button
              v-if="closable"
              type="button"
              class="hh-drawer-close"
              aria-label="关闭抽屉"
              @click="requestClose"
            >
              ×
            </button>
          </header>

          <div class="hh-drawer-body">
            <slot />
          </div>

          <footer
            v-if="showConfirm || showCancel || $slots.footer"
            class="hh-drawer-footer"
          >
            <slot
              name="footer"
              :confirm="handleConfirm"
              :cancel="requestClose"
              :loading="confirmLoading"
            >
              <button
                v-if="showCancel"
                type="button"
                class="hh-drawer-btn hh-drawer-btn--cancel"
                @click="requestClose"
              >
                {{ cancelText }}
              </button>
              <button
                v-if="showConfirm"
                type="button"
                class="hh-drawer-btn hh-drawer-btn--confirm"
                :disabled="confirmLoading"
                @click="handleConfirm"
              >
                {{ confirmLoading ? '处理中…' : confirmText }}
              </button>
            </slot>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hh-drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.hh-drawer-panel {
  position: absolute;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
}

.hh-drawer--right,
.hh-drawer--left {
  top: 0;
  bottom: 0;
  width: 360px;
}

.hh-drawer--right {
  right: 0;
}

.hh-drawer--left {
  left: 0;
}

.hh-drawer--top,
.hh-drawer--bottom {
  left: 0;
  right: 0;
  height: 360px;
}

.hh-drawer--top {
  top: 0;
}

.hh-drawer--bottom {
  bottom: 0;
}

.hh-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.hh-drawer-title {
  font-size: 16px;
  font-weight: 600;
}

.hh-drawer-close {
  border: 0;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
  color: #999;
}

.hh-drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px;
}

.hh-drawer-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.hh-drawer-btn {
  height: 32px;
  padding: 0 14px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
}

.hh-drawer-btn--confirm {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.hh-drawer-btn--confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ---- placement：蒙层淡入淡出 + 面板从对应边滑入/滑出 ---- */

.hh-drawer-right-enter-active,
.hh-drawer-right-leave-active,
.hh-drawer-left-enter-active,
.hh-drawer-left-leave-active,
.hh-drawer-top-enter-active,
.hh-drawer-top-leave-active,
.hh-drawer-bottom-enter-active,
.hh-drawer-bottom-leave-active {
  transition: opacity 0.2s ease;
}

.hh-drawer-right-enter-active .hh-drawer-panel,
.hh-drawer-right-leave-active .hh-drawer-panel,
.hh-drawer-left-enter-active .hh-drawer-panel,
.hh-drawer-left-leave-active .hh-drawer-panel,
.hh-drawer-top-enter-active .hh-drawer-panel,
.hh-drawer-top-leave-active .hh-drawer-panel,
.hh-drawer-bottom-enter-active .hh-drawer-panel,
.hh-drawer-bottom-leave-active .hh-drawer-panel {
  transition: transform 0.24s ease;
}

.hh-drawer-right-enter-from,
.hh-drawer-right-leave-to,
.hh-drawer-left-enter-from,
.hh-drawer-left-leave-to,
.hh-drawer-top-enter-from,
.hh-drawer-top-leave-to,
.hh-drawer-bottom-enter-from,
.hh-drawer-bottom-leave-to {
  opacity: 0;
}

.hh-drawer-right-enter-from .hh-drawer-panel,
.hh-drawer-right-leave-to .hh-drawer-panel {
  transform: translateX(100%);
}

.hh-drawer-left-enter-from .hh-drawer-panel,
.hh-drawer-left-leave-to .hh-drawer-panel {
  transform: translateX(-100%);
}

.hh-drawer-top-enter-from .hh-drawer-panel,
.hh-drawer-top-leave-to .hh-drawer-panel {
  transform: translateY(-100%);
}

.hh-drawer-bottom-enter-from .hh-drawer-panel,
.hh-drawer-bottom-leave-to .hh-drawer-panel {
  transform: translateY(100%);
}
</style>
