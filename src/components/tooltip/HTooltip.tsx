/// <reference types="vue/jsx" />
import {
  defineComponent,
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  Transition,
  type SlotsType,
  type PropType,
  type CSSProperties,
} from 'vue'
import { calcTooltipPosition } from './useTooltipPosition'
import './tooltip.scss'

// ==================== Props 定义 ====================

const tooltipProps = {
  content: String,
  placement: {
    type: String as PropType<'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end'>,
    default: 'top',
  },
  trigger: {
    type: String as PropType<'hover' | 'focus' | 'click' | 'manual'>,
    default: 'hover',
  },
  disabled: Boolean,
  offset: {
    type: Number as PropType<number>,
    default: 8,
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
    default: undefined,
  },
  zIndex: {
    type: Number as PropType<number>,
    default: 9999,
  },
  visible: Boolean,
  transition: {
    type: String as PropType<string>,
    default: 'hh-tooltip-fade',
  },
}

// ==================== HTooltip ====================

const HTooltip = defineComponent({
  name: 'HTooltip',
  props: tooltipProps,
  emits: ['update:visible'],
  slots: Object as SlotsType<{
    default: {}
    content: {}
  }>,
  setup(props, { emit, slots }) {
    const isVisible = ref(false)
    const referenceRef = ref<HTMLElement | null>(null)
    const popperRef = ref<HTMLElement | null>(null)

    type Placement = NonNullable<typeof props.placement>
    const actualPlacement = ref<Placement>(props.placement as Placement)

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
        props.placement as Placement,
        props.offset,
      )

      actualPlacement.value = result.actualPlacement as Placement

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

    const placementSide = computed(() => actualPlacement.value.split('-')[0])

    const maxWidthStyle = computed(() => {
      if (!props.maxWidth) {
        return undefined
      }
      return typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
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
      const popperContent = (
        <div
          class="hh-tooltip__content"
          style={{ maxWidth: maxWidthStyle.value }}
        >
          {slots.content?.() ?? props.content}
        </div>
      )

      const popper = isVisible.value ? (
        <div
          ref={popperRef}
          class={[
            'hh-tooltip',
            `hh-tooltip--${placementSide.value}`,
          ]}
          style={popperStyle.value}
          role="tooltip"
          onMouseenter={onPopperMouseEnter}
          onMouseleave={onPopperMouseLeave}
        >
          {popperContent}
          <div class="hh-tooltip__arrow" style={arrowStyle.value} />
        </div>
      ) : null

      return (
        <div
          class="hh-tooltip-wrapper"
          onMouseenter={onMouseEnter}
          onMouseleave={onMouseLeave}
          onFocusin={onFocusIn}
          onFocusout={onFocusOut}
          onClick={onClick}
        >
          <div ref={referenceRef} class="hh-tooltip-reference">
            {slots.default?.()}
          </div>
          <Teleport to="body">
            <Transition name={props.transition}>
              {popper}
            </Transition>
          </Teleport>
        </div>
      )
    }
  },
})

export { HTooltip, tooltipProps }
