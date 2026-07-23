<script setup lang="ts">
/**
 * @description 声明式通用 Modal 壳：v-model 显隐，不入全局 modal 栈。
 * 支持可选拖拽（`draggable`）与进出场 Transition。
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ModalType } from './types'
import {
  isTopHModalInstance,
  registerHModalInstance,
  unregisterHModalInstance,
} from './hModalRegistry'

defineOptions({ name: 'HModal' })

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    type?: ModalType
    maskClosable?: boolean
    closable?: boolean
    showConfirm?: boolean
    showCancel?: boolean
    confirmText?: string
    cancelText?: string
    confirmLoading?: boolean
    /** 是否允许拖拽标题栏移动位置，默认关闭 */
    draggable?: boolean
    zIndex?: number
    className?: string | string[]
    style?: string | CSSProperties
  }>(),
  {
    title: '',
    type: 'info',
    maskClosable: true,
    closable: true,
    showConfirm: true,
    showCancel: true,
    confirmText: '确定',
    cancelText: '取消',
    confirmLoading: false,
    draggable: false,
    zIndex: 1000,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
  close: []
  /** 离场动画结束（供 Layer 延迟出栈） */
  afterLeave: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const titleId = `hh-modal-title-${Math.random().toString(36).slice(2)}`
let previouslyFocused: HTMLElement | null = null
let registryId: symbol | null = null

/** 拖拽位移（px），经 CSS 变量合成到 transform，避免与进出场动画冲突 */
const dragOffset = reactive({ x: 0, y: 0 })
let dragStartX = 0
let dragStartY = 0
let originX = 0
let originY = 0
let dragging = false

const dialogClass = computed(() => [
  'hh-modal-dialog',
  `hh-modal--${props.type}`,
  props.className,
])

const dialogStyle = computed(() => {
  const vars: Record<string, string> = {
    '--hh-modal-dx': `${dragOffset.x}px`,
    '--hh-modal-dy': `${dragOffset.y}px`,
  }
  if (!props.style) return vars
  if (typeof props.style === 'string') return [props.style, vars]
  return { ...props.style, ...vars }
})

/**
 * 收集 dialog 内可聚焦元素。
 */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ))
}

/**
 * 重置拖拽位移。
 */
function resetDrag(): void {
  dragOffset.x = 0
  dragOffset.y = 0
  stopDragListeners()
  dragging = false
}

/**
 * 关闭弹层：cancel → close → 更新 v-model。
 */
function requestClose(): void {
  emit('cancel')
  emit('close')
  emit('update:modelValue', false)
}

/**
 * 确认：仅抛事件，不自动关闭。
 */
function handleConfirm(): void {
  emit('confirm')
}

/**
 * 蒙层点击：仅 maskClosable 时关闭。
 */
function handleMaskClick(): void {
  if (props.maskClosable) requestClose()
}

/**
 * 标题栏按下开始拖拽（忽略关闭按钮）。
 */
function onHeaderPointerDown(event: MouseEvent): void {
  if (!props.draggable || event.button !== 0) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.hh-modal-close-btn')) return
  dragging = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  originX = dragOffset.x
  originY = dragOffset.y
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup', onDragEnd)
  event.preventDefault()
}

function onDragMove(event: MouseEvent): void {
  if (!dragging) return
  dragOffset.x = originX + (event.clientX - dragStartX)
  dragOffset.y = originY + (event.clientY - dragStartY)
}

function onDragEnd(): void {
  dragging = false
  stopDragListeners()
}

function stopDragListeners(): void {
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup', onDragEnd)
}

/**
 * ESC / Tab 焦点陷阱。
 */
function onKeydown(event: KeyboardEvent): void {
  if (!props.modelValue || !registryId || !isTopHModalInstance(registryId)) return
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return
  const focusable = getFocusable(dialogRef.value)
  const first = focusable[0] ?? dialogRef.value
  const last = focusable[focusable.length - 1] ?? dialogRef.value
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  }
  else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * 离场结束：先通知父级出栈，再还原焦点（避免卸载抢焦）。
 */
function onAfterLeave(): void {
  if (registryId) {
    unregisterHModalInstance(registryId)
    registryId = null
  }
  document.removeEventListener('keydown', onKeydown)
  const toRestore = previouslyFocused
  previouslyFocused = null
  resetDrag()
  emit('afterLeave')
  void nextTick(() => toRestore?.focus())
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      resetDrag()
      previouslyFocused = document.activeElement as HTMLElement | null
      registryId = registerHModalInstance(props.zIndex)
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      const dialog = dialogRef.value
      if (dialog) (getFocusable(dialog)[0] ?? dialog).focus()
    }
    else {
      // 离场动画期间仍保留 registry，待 afterLeave 再注销；先卸 keydown 避免重复 ESC
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

watch(
  () => props.zIndex,
  (zIndex) => {
    if (!props.modelValue || !registryId) return
    unregisterHModalInstance(registryId)
    registryId = registerHModalInstance(zIndex)
  },
)

onBeforeUnmount(() => {
  stopDragListeners()
  if (registryId) {
    unregisterHModalInstance(registryId)
    registryId = null
  }
  document.removeEventListener('keydown', onKeydown)
  previouslyFocused?.focus()
  previouslyFocused = null
})
</script>

<template>
  <Teleport to="body">
    <Transition name="hh-modal" @after-leave="onAfterLeave">
      <div
        v-if="modelValue"
        class="hh-modal-mask"
        :style="{ zIndex }"
        @click.self="handleMaskClick"
      >
        <div
          ref="dialogRef"
          :class="dialogClass"
          :style="dialogStyle"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :data-modal-id="titleId"
          tabindex="-1"
        >
          <div
            class="hh-modal-header"
            :class="{ 'hh-modal-header--draggable': draggable }"
            @mousedown="onHeaderPointerDown"
          >
            <slot name="header">
              <span :id="titleId" class="hh-modal-title">
                <slot name="title">{{ title || '弹层' }}</slot>
              </span>
              <button
                v-if="closable"
                type="button"
                class="hh-modal-close-btn"
                aria-label="关闭弹层"
                @click="requestClose"
              >
                ×
              </button>
            </slot>
          </div>
          <div class="hh-modal-body">
            <slot />
          </div>
          <div
            v-if="showConfirm || showCancel || $slots.footer"
            class="hh-modal-footer"
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
                class="hh-modal-btn hh-modal-btn--cancel"
                @click="requestClose"
              >
                {{ cancelText }}
              </button>
              <button
                v-if="showConfirm"
                type="button"
                class="hh-modal-btn hh-modal-btn--confirm"
                :class="{ 'hh-modal-btn--danger': type === 'danger' }"
                :disabled="confirmLoading"
                @click="handleConfirm"
              >
                {{ confirmLoading ? '处理中…' : confirmText }}
              </button>
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hh-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hh-modal-dialog {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  min-width: 380px;
  max-width: min(520px, calc(100vw - 48px));
  overflow: hidden;
  transform: translate(var(--hh-modal-dx, 0px), var(--hh-modal-dy, 0px));
}

.hh-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.hh-modal-header--draggable {
  cursor: move;
  user-select: none;
}

.hh-modal-header--draggable .hh-modal-close-btn {
  cursor: pointer;
}

.hh-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.hh-modal-close-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0 4px;
  line-height: 1;
}

.hh-modal-close-btn:hover {
  color: #333;
}

.hh-modal-body {
  padding: 16px 24px;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  min-height: 48px;
}

.hh-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}

.hh-modal-btn {
  padding: 6px 18px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  transition: all 0.15s;
}

.hh-modal-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.hh-modal-btn--confirm {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.hh-modal-btn--confirm:hover {
  background: #4096ff;
  border-color: #4096ff;
}

.hh-modal-btn--confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.hh-modal-btn--danger {
  background: #ff4d4f;
  border-color: #ff4d4f;
}

.hh-modal-btn--danger:hover {
  background: #ff7875;
  border-color: #ff7875;
}

.hh-modal--warning .hh-modal-title {
  color: #fa8c16;
}

.hh-modal--danger .hh-modal-title {
  color: #ff4d4f;
}

.hh-modal--success .hh-modal-title {
  color: #52c41a;
}

/* 蒙层淡入淡出 */
.hh-modal-enter-active,
.hh-modal-leave-active {
  transition: opacity 0.2s ease;
}

.hh-modal-enter-active .hh-modal-dialog,
.hh-modal-leave-active .hh-modal-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.hh-modal-enter-from,
.hh-modal-leave-to {
  opacity: 0;
}

.hh-modal-enter-from .hh-modal-dialog {
  opacity: 0;
  transform: translate(
    var(--hh-modal-dx, 0px),
    calc(var(--hh-modal-dy, 0px) - 12px)
  ) scale(0.97);
}

.hh-modal-leave-to .hh-modal-dialog {
  opacity: 0;
  transform: translate(
    var(--hh-modal-dx, 0px),
    calc(var(--hh-modal-dy, 0px) - 8px)
  ) scale(0.97);
}
</style>
