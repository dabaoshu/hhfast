/// <reference types="vue/jsx" />
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  Teleport,
  Transition,
  type SlotsType,
  type PropType,
  type CSSProperties,
} from 'vue'
import type { PopoverPlacement } from './types'
import { calcTooltipPosition } from '../tooltip/useTooltipPosition'
import './popover.scss'

let popoverIdSequence = 0

// ==================== Props 定义 ====================

const popoverProps = {
  title: String,
  content: String,
  placement: {
    type: String as PropType<PopoverPlacement>,
    default: 'top',
  },
  trigger: {
    type: String as PropType<'hover' | 'focus' | 'click' | 'manual'>,
    default: 'hover',
  },
  disabled: Boolean,
  offset: {
    type: Number as PropType<number>,
    default: 12,
  },
  showDelay: {
    type: Number as PropType<number>,
    default: 100,
  },
  hideDelay: {
    type: Number as PropType<number>,
    default: 100,
  },
  enterable: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  maxWidth: {
    type: [Number, String] as PropType<number | string>,
    default: 320,
  },
  zIndex: {
    type: Number as PropType<number>,
    default: 9999,
  },
  transition: {
    type: String as PropType<string>,
    default: 'hh-popover-fade',
  },
  overlayClassName: String,
  overlayStyle: Object as PropType<CSSProperties>,
  arrow: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  visible: Boolean,
}

// ==================== HPopover ====================

const HPopover = defineComponent({
  name: 'HPopover',
  props: popoverProps,
  emits: ['update:visible'],
  slots: Object as SlotsType<{
    default: {}
    title: {}
    content: {}
  }>,
  setup(props, { emit, slots }) {
    const popoverId = `hh-popover-${++popoverIdSequence}`
    const isVisible = ref(false)
    const referenceRef = ref<HTMLElement | null>(null)
    const popperRef = ref<HTMLElement | null>(null)
    const actualPlacement = ref<PopoverPlacement>(props.placement as PopoverPlacement)

    let showTimer: ReturnType<typeof setTimeout> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const popperStyle = ref<CSSProperties>({
      position: 'absolute',
      top: '0px',
      left: '0px',
      zIndex: props.zIndex,
    })

    const arrowStyle = ref<CSSProperties>({})

    // ---- 显隐控制 ----

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

    // ---- 定位 ----

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
        props.placement as PopoverPlacement,
        props.offset,
      )

      actualPlacement.value = result.actualPlacement

      popperStyle.value = {
        position: 'absolute',
        top: `${result.top}px`,
        left: `${result.left}px`,
        zIndex: props.zIndex,
      }

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

    // ---- 事件 ----

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

    // ---- 计算属性 ----

    const hasTitle = computed(() => !!slots.title || !!props.title)

    const placementSide = computed(() => actualPlacement.value.split('-')[0])

    const maxWidthStyle = computed(() => {
      if (!props.maxWidth) {
        return undefined
      }
      return typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
    })

    const mergedStyle = computed(() => {
      const base: CSSProperties = { ...popperStyle.value }
      if (props.overlayStyle) {
        Object.assign(base, props.overlayStyle)
      }
      return base
    })

    // ---- 生命周期 ----

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

    // ---- 渲染 ----

    return () => {
      const popperNodes = isVisible.value ? (
        <div
          id={popoverId}
          ref={popperRef}
          class={[
            'hh-popover',
            `hh-popover--${placementSide.value}`,
            props.overlayClassName,
          ]}
          style={mergedStyle.value}
          role="dialog"
          onMouseenter={onPopperMouseEnter}
          onMouseleave={onPopperMouseLeave}
        >
          <div class="hh-popover__inner" style={{ maxWidth: maxWidthStyle.value }}>
            {hasTitle.value && (
              <div class="hh-popover__title">
                {slots.title?.() ?? props.title}
              </div>
            )}
            <div class="hh-popover__content">
              {slots.content?.() ?? props.content}
            </div>
          </div>
          {props.arrow && (
            <div class="hh-popover__arrow" style={arrowStyle.value} />
          )}
        </div>
      ) : null

      return (
        <div
          class="hh-popover-wrapper"
          onMouseenter={onMouseEnter}
          onMouseleave={onMouseLeave}
          onFocusin={onFocusIn}
          onFocusout={onFocusOut}
          onClick={onClick}
        >
          <div
            ref={referenceRef}
            class="hh-popover-reference"
            aria-controls={popoverId}
            aria-expanded={isVisible.value ? 'true' : 'false'}
          >
            {slots.default?.()}
          </div>
          <Teleport to="body">
            <Transition name={props.transition}>
              {popperNodes}
            </Transition>
          </Teleport>
        </div>
      )
    }
  },
})

export { HPopover, popoverProps }
