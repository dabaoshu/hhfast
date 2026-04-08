<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  useSlots,
  type CSSProperties,
} from 'vue'
import type { TooltipProps, TooltipPlacement } from './types'
import { calcTooltipPosition } from './useTooltipPosition'

defineOptions({ name: 'HTooltip' })

const props = withDefaults(defineProps<TooltipProps>(), {
  placement: 'top',
  trigger: 'hover',
  disabled: false,
  offset: 8,
  showDelay: 100,
  hideDelay: 100,
  enterable: true,
  zIndex: 9999,
  transition: 'hh-tooltip-fade',
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const slots = useSlots()

const isVisible = ref(false)
const referenceRef = ref<HTMLElement | null>(null)
const popperRef = ref<HTMLElement | null>(null)
const actualPlacement = ref<TooltipPlacement>(props.placement)

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

const popperStyle = ref<CSSProperties>({
  position: 'absolute',
  top: '0px',
  left: '0px',
  zIndex: props.zIndex,
})

const arrowStyle = ref<CSSProperties>({})

// ==================== 显隐控制 ====================

function clearTimers(): void {
  if (showTimer !== null) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function doShow(): void {
  if (props.disabled) {
    return
  }
  clearTimers()
  if (props.trigger === 'hover' && props.showDelay > 0) {
    showTimer = setTimeout(() => {
      isVisible.value = true
    }, props.showDelay)
  }
  else {
    isVisible.value = true
  }
}

function doHide(): void {
  clearTimers()
  if (props.trigger === 'hover' && props.hideDelay > 0) {
    hideTimer = setTimeout(() => {
      isVisible.value = false
    }, props.hideDelay)
  }
  else {
    isVisible.value = false
  }
}

function toggle(): void {
  if (isVisible.value) {
    doHide()
  }
  else {
    doShow()
  }
}

// ==================== 定位 ====================

async function updatePosition(): Promise<void> {
  await nextTick()
  const refEl = referenceRef.value
  const popEl = popperRef.value
  if (!refEl || !popEl) {
    return
  }

  const refRect = refEl.getBoundingClientRect()
  const popRect = popEl.getBoundingClientRect()

  const result = calcTooltipPosition(
    refRect,
    popRect,
    props.placement,
    props.offset,
  )

  actualPlacement.value = result.actualPlacement

  popperStyle.value = {
    position: 'absolute',
    top: `${result.top}px`,
    left: `${result.left}px`,
    zIndex: props.zIndex,
  }

  // 箭头定位
  const side = result.actualPlacement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right'
  if (side === 'top' || side === 'bottom') {
    const clampedArrow = Math.max(12, Math.min(result.arrowOffset, popRect.width - 12))
    arrowStyle.value = { left: `${clampedArrow}px` }
  }
  else {
    const clampedArrow = Math.max(12, Math.min(result.arrowOffset, popRect.height - 12))
    arrowStyle.value = { top: `${clampedArrow}px` }
  }
}

// ==================== 事件绑定 ====================

function onMouseEnter(): void {
  if (props.trigger === 'hover') {
    doShow()
  }
}

function onMouseLeave(): void {
  if (props.trigger === 'hover') {
    doHide()
  }
}

function onPopperMouseEnter(): void {
  if (props.trigger === 'hover' && props.enterable) {
    clearTimers()
  }
}

function onPopperMouseLeave(): void {
  if (props.trigger === 'hover') {
    doHide()
  }
}

function onFocusIn(): void {
  if (props.trigger === 'focus') {
    doShow()
  }
}

function onFocusOut(): void {
  if (props.trigger === 'focus') {
    doHide()
  }
}

function onClick(): void {
  if (props.trigger === 'click') {
    toggle()
  }
}

function onClickOutside(e: MouseEvent): void {
  if (props.trigger !== 'click' || !isVisible.value) {
    return
  }
  const target = e.target as Node
  if (
    referenceRef.value?.contains(target)
    || popperRef.value?.contains(target)
  ) {
    return
  }
  doHide()
}

// ==================== 生命周期 ====================

watch(isVisible, (val) => {
  emit('update:visible', val)
  if (val) {
    updatePosition()
  }
})

watch(() => props.visible, (val) => {
  if (props.trigger === 'manual' && val !== undefined) {
    isVisible.value = val
  }
})

watch(() => props.placement, () => {
  if (isVisible.value) {
    updatePosition()
  }
})

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)

  // manual 初始值
  if (props.trigger === 'manual' && props.visible) {
    isVisible.value = true
  }
})

onBeforeUnmount(() => {
  clearTimers()
  document.removeEventListener('click', onClickOutside, true)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})

const placementSide = computed(() => actualPlacement.value.split('-')[0])

const maxWidthStyle = computed(() => {
  if (!props.maxWidth) {
    return undefined
  }
  return typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
})
</script>

<template>
  <div
    class="hh-tooltip-wrapper"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @click="onClick"
  >
    <!-- 触发元素 -->
    <div ref="referenceRef" class="hh-tooltip-reference">
      <slot />
    </div>

    <!-- 浮层 -->
    <Teleport to="body">
      <Transition :name="transition">
        <div
          v-if="isVisible"
          ref="popperRef"
          :class="['hh-tooltip', `hh-tooltip--${placementSide}`]"
          :style="popperStyle"
          role="tooltip"
          @mouseenter="onPopperMouseEnter"
          @mouseleave="onPopperMouseLeave"
        >
          <div
            class="hh-tooltip__content"
            :style="{ maxWidth: maxWidthStyle }"
          >
            <slot name="content">{{ content }}</slot>
          </div>
          <div
            class="hh-tooltip__arrow"
            :style="arrowStyle"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
$bg: rgba(0, 0, 0, 0.85);
$arrow-size: 6px;
$radius: 6px;

.hh-tooltip-wrapper {
  display: inline-block;
}

.hh-tooltip-reference {
  display: inline-block;
}

.hh-tooltip {
  pointer-events: auto;

  &__content {
    padding: 6px 10px;
    font-size: 13px;
    line-height: 1.5;
    color: #fff;
    background: $bg;
    border-radius: $radius;
    word-wrap: break-word;
  }

  &__arrow {
    position: absolute;
    width: 0;
    height: 0;
    border: $arrow-size solid transparent;
  }

  // ---- top ----
  &--top {
    .hh-tooltip__arrow {
      bottom: -#{$arrow-size * 2};
      border-top-color: $bg;
      transform: translateX(-50%);
    }
  }

  // ---- bottom ----
  &--bottom {
    .hh-tooltip__arrow {
      top: -#{$arrow-size * 2};
      border-bottom-color: $bg;
      transform: translateX(-50%);
    }
  }

  // ---- left ----
  &--left {
    .hh-tooltip__arrow {
      right: -#{$arrow-size * 2};
      border-left-color: $bg;
      transform: translateY(-50%);
    }
  }

  // ---- right ----
  &--right {
    .hh-tooltip__arrow {
      left: -#{$arrow-size * 2};
      border-right-color: $bg;
      transform: translateY(-50%);
    }
  }
}

// ---- 过渡动画 ----
.hh-tooltip-fade-enter-active,
.hh-tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.hh-tooltip-fade-enter-from,
.hh-tooltip-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
