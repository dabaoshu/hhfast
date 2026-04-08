import type { Directive, DirectiveBinding } from 'vue'
import type { TooltipDirectiveValue, TooltipDirectiveOptions, TooltipPlacement, TooltipTrigger } from './types'
import { calcTooltipPosition } from './useTooltipPosition'

/**
 * 指令实例状态。
 */
interface TooltipState {
  popperEl: HTMLElement | null
  arrowEl: HTMLElement | null
  options: Required<TooltipDirectiveOptions>
  visible: boolean
  showTimer: ReturnType<typeof setTimeout> | null
  hideTimer: ReturnType<typeof setTimeout> | null
  cleanup: (() => void) | null
}

const stateMap = new WeakMap<HTMLElement, TooltipState>()

/**
 * 从绑定值和修饰符解析配置。
 */
function resolveOptions(binding: DirectiveBinding<TooltipDirectiveValue>): Required<TooltipDirectiveOptions> {
  const value = binding.value
  const base: Required<TooltipDirectiveOptions> = {
    content: '',
    placement: 'top',
    trigger: 'hover',
    disabled: false,
    offset: 8,
    showDelay: 100,
    hideDelay: 100,
    enterable: true,
    maxWidth: '',
  }

  if (typeof value === 'string') {
    base.content = value
  }
  else if (value && typeof value === 'object') {
    Object.assign(base, value)
  }

  // 修饰符覆盖
  const mods = binding.modifiers
  const placements: TooltipPlacement[] = [
    'top', 'bottom', 'left', 'right',
    'top-start', 'top-end', 'bottom-start', 'bottom-end',
    'left-start', 'left-end', 'right-start', 'right-end',
  ]
  for (const p of placements) {
    if (mods[p]) {
      base.placement = p
      break
    }
  }

  const triggers: TooltipTrigger[] = ['hover', 'focus', 'click', 'manual']
  for (const t of triggers) {
    if (mods[t]) {
      base.trigger = t
      break
    }
  }

  return base
}

/**
 * 创建浮层 DOM。
 */
function createPopperEl(): { popperEl: HTMLElement; arrowEl: HTMLElement } {
  const popperEl = document.createElement('div')
  popperEl.className = 'hh-tooltip hh-tooltip--top'
  popperEl.setAttribute('role', 'tooltip')
  popperEl.style.position = 'absolute'
  popperEl.style.top = '0px'
  popperEl.style.left = '0px'
  popperEl.style.zIndex = '9999'
  popperEl.style.pointerEvents = 'auto'
  popperEl.style.opacity = '0'
  popperEl.style.transition = 'opacity 0.15s ease, transform 0.15s ease'
  popperEl.style.transform = 'scale(0.96)'

  const contentEl = document.createElement('div')
  contentEl.className = 'hh-tooltip__content'
  popperEl.appendChild(contentEl)

  const arrowEl = document.createElement('div')
  arrowEl.className = 'hh-tooltip__arrow'
  popperEl.appendChild(arrowEl)

  return { popperEl, arrowEl }
}

/**
 * 更新浮层内容和样式。
 */
function updatePopper(el: HTMLElement, state: TooltipState): void {
  const { popperEl, options } = state
  if (!popperEl) {
    return
  }

  const contentEl = popperEl.querySelector('.hh-tooltip__content') as HTMLElement
  if (contentEl) {
    contentEl.textContent = options.content
    if (options.maxWidth) {
      contentEl.style.maxWidth = typeof options.maxWidth === 'number'
        ? `${options.maxWidth}px`
        : options.maxWidth
    }
  }
}

/**
 * 计算并应用位置。
 */
function positionPopper(el: HTMLElement, state: TooltipState): void {
  const { popperEl, arrowEl, options } = state
  if (!popperEl) {
    return
  }

  const refRect = el.getBoundingClientRect()
  const popRect = popperEl.getBoundingClientRect()

  const result = calcTooltipPosition(refRect, popRect, options.placement, options.offset)

  popperEl.style.top = `${result.top}px`
  popperEl.style.left = `${result.left}px`

  // 更新方位 class
  const side = result.actualPlacement.split('-')[0]
  popperEl.className = `hh-tooltip hh-tooltip--${side}`

  // 箭头
  if (arrowEl) {
    if (side === 'top' || side === 'bottom') {
      const clamped = Math.max(12, Math.min(result.arrowOffset, popRect.width - 12))
      arrowEl.style.left = `${clamped}px`
      arrowEl.style.top = ''
      arrowEl.style.transform = 'translateX(-50%)'
    }
    else {
      const clamped = Math.max(12, Math.min(result.arrowOffset, popRect.height - 12))
      arrowEl.style.top = `${clamped}px`
      arrowEl.style.left = ''
      arrowEl.style.transform = 'translateY(-50%)'
    }
  }
}

/**
 * 显示浮层。
 */
function show(el: HTMLElement, state: TooltipState): void {
  if (state.visible || state.options.disabled || !state.options.content) {
    return
  }
  clearTimers(state)

  const delay = state.options.trigger === 'hover' ? state.options.showDelay : 0
  state.showTimer = setTimeout(() => {
    if (!state.popperEl) {
      const { popperEl, arrowEl } = createPopperEl()
      state.popperEl = popperEl
      state.arrowEl = arrowEl
    }

    updatePopper(el, state)
    document.body.appendChild(state.popperEl!)
    state.visible = true

    // 强制重排后显示
    void state.popperEl!.offsetHeight
    positionPopper(el, state)
    state.popperEl!.style.opacity = '1'
    state.popperEl!.style.transform = 'scale(1)'

    // 鼠标可进入浮层
    if (state.options.enterable && state.options.trigger === 'hover') {
      state.popperEl!.addEventListener('mouseenter', () => clearTimers(state))
      state.popperEl!.addEventListener('mouseleave', () => hide(el, state))
    }
  }, delay)
}

/**
 * 隐藏浮层。
 */
function hide(el: HTMLElement, state: TooltipState): void {
  clearTimers(state)

  const delay = state.options.trigger === 'hover' ? state.options.hideDelay : 0
  state.hideTimer = setTimeout(() => {
    if (!state.popperEl || !state.visible) {
      return
    }
    state.popperEl.style.opacity = '0'
    state.popperEl.style.transform = 'scale(0.96)'

    setTimeout(() => {
      if (state.popperEl?.parentNode) {
        state.popperEl.parentNode.removeChild(state.popperEl)
      }
      state.visible = false
    }, 150)
  }, delay)
}

function clearTimers(state: TooltipState): void {
  if (state.showTimer !== null) {
    clearTimeout(state.showTimer)
    state.showTimer = null
  }
  if (state.hideTimer !== null) {
    clearTimeout(state.hideTimer)
    state.hideTimer = null
  }
}

/**
 * 绑定事件。
 */
function bindEvents(el: HTMLElement, state: TooltipState): void {
  const handlers: Array<[string, EventListener, boolean?]> = []

  const onMouseEnter = () => show(el, state)
  const onMouseLeave = () => hide(el, state)
  const onFocusIn = () => show(el, state)
  const onFocusOut = () => hide(el, state)
  const onClick = () => {
    if (state.visible) {
      hide(el, state)
    }
    else {
      show(el, state)
    }
  }
  const onClickOutside = (e: Event) => {
    if (!state.visible) {
      return
    }
    const target = e.target as Node
    if (el.contains(target) || state.popperEl?.contains(target)) {
      return
    }
    hide(el, state)
  }
  const onScroll = () => {
    if (state.visible) {
      positionPopper(el, state)
    }
  }
  const onResize = () => {
    if (state.visible) {
      positionPopper(el, state)
    }
  }

  switch (state.options.trigger) {
    case 'hover':
      el.addEventListener('mouseenter', onMouseEnter)
      el.addEventListener('mouseleave', onMouseLeave)
      handlers.push(['mouseenter', onMouseEnter], ['mouseleave', onMouseLeave])
      break
    case 'focus':
      el.addEventListener('focusin', onFocusIn)
      el.addEventListener('focusout', onFocusOut)
      handlers.push(['focusin', onFocusIn], ['focusout', onFocusOut])
      break
    case 'click':
      el.addEventListener('click', onClick)
      document.addEventListener('click', onClickOutside, true)
      handlers.push(['click', onClick])
      break
  }

  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)

  state.cleanup = () => {
    for (const [evt, handler] of handlers) {
      el.removeEventListener(evt, handler)
    }
    document.removeEventListener('click', onClickOutside as EventListener, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
  }
}

/**
 * 销毁。
 */
function destroy(el: HTMLElement): void {
  const state = stateMap.get(el)
  if (!state) {
    return
  }
  clearTimers(state)
  state.cleanup?.()
  if (state.popperEl?.parentNode) {
    state.popperEl.parentNode.removeChild(state.popperEl)
  }
  stateMap.delete(el)
}

/**
 * v-tooltip 自定义指令。
 *
 * @example
 * ```html
 * <!-- 基础用法 -->
 * <button v-tooltip="'提示文字'">悬浮显示</button>
 *
 * <!-- 修饰符指定方位 -->
 * <button v-tooltip.bottom="'底部提示'">底部</button>
 *
 * <!-- 修饰符指定触发方式 -->
 * <button v-tooltip.click="'点击显示'">点击</button>
 *
 * <!-- 完整配置 -->
 * <button v-tooltip="{ content: '提示', placement: 'right', trigger: 'click' }">
 *   完整配置
 * </button>
 * ```
 */
export const vTooltip: Directive<HTMLElement, TooltipDirectiveValue> = {
  mounted(el, binding) {
    const options = resolveOptions(binding)
    const state: TooltipState = {
      popperEl: null,
      arrowEl: null,
      options,
      visible: false,
      showTimer: null,
      hideTimer: null,
      cleanup: null,
    }
    stateMap.set(el, state)
    bindEvents(el, state)
  },

  updated(el, binding) {
    const state = stateMap.get(el)
    if (!state) {
      return
    }
    const newOptions = resolveOptions(binding)
    const triggerChanged = state.options.trigger !== newOptions.trigger
    state.options = newOptions

    if (triggerChanged) {
      state.cleanup?.()
      bindEvents(el, state)
    }

    if (state.visible) {
      updatePopper(el, state)
      positionPopper(el, state)
    }
  },

  unmounted(el) {
    destroy(el)
  },
}
