/// <reference types="vue/jsx" />
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  type PropType,
  type VNode,
  type CSSProperties,
} from 'vue'
import type {
  SplitterOrientation,
  SplitterCollapsible,
  SplitterSize,
  InternalPanelState,
} from './types'
import { SplitterPanel, splitterPanelProps } from './SplitterPanel'
import './splitter.scss'

// ==================== 工具函数 ====================

/**
 * 将 SplitterSize 转为百分比（基于容器总尺寸）。
 */
function sizeToPercent(size: SplitterSize | undefined, containerSize: number): number | undefined {
  if (size === undefined || size === null) {
    return undefined
  }
  if (typeof size === 'number') {
    return containerSize > 0 ? (size / containerSize) * 100 : 0
  }
  const str = String(size).trim()
  if (str.endsWith('%')) {
    return parseFloat(str)
  }
  if (str.endsWith('px')) {
    const px = parseFloat(str)
    return containerSize > 0 ? (px / containerSize) * 100 : 0
  }
  const num = parseFloat(str)
  return Number.isFinite(num) ? (containerSize > 0 ? (num / containerSize) * 100 : 0) : undefined
}

/**
 * 解析 collapsible prop。
 */
function normalizeCollapsible(val: boolean | SplitterCollapsible | undefined): SplitterCollapsible {
  if (!val) {
    return {}
  }
  if (val === true) {
    return { start: true, end: true }
  }
  return val
}

/**
 * 百分比转 px。
 */
function percentToPx(percent: number, containerSize: number): number {
  return (percent / 100) * containerSize
}

// ==================== Splitter 主组件 ====================

const Splitter = defineComponent({
  name: 'HSplitter',
  props: {
    /** 分割方向。 */
    orientation: {
      type: String as PropType<SplitterOrientation>,
      default: 'horizontal',
    },
    /** 是否懒渲染。 */
    lazy: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
  },
  emits: ['resize', 'resizeStart', 'resizeEnd'],
  setup(props, { slots, emit }) {
    const containerRef = ref<HTMLElement | null>(null)
    const containerSize = ref(0)
    const panels = ref<InternalPanelState[]>([])
    const isDragging = ref(false)
    const draggingIndex = ref(-1)
    const lazySizes = ref<number[]>([])
    const panelConfigSignature = ref('')

    // ---- 容器尺寸观察 ----
    let resizeObserver: ResizeObserver | null = null

    function updateContainerSize(): void {
      if (!containerRef.value) {
        return
      }
      const rect = containerRef.value.getBoundingClientRect()
      containerSize.value = props.orientation === 'horizontal' ? rect.width : rect.height
    }

    onMounted(() => {
      updateContainerSize()
      if (containerRef.value) {
        resizeObserver = new ResizeObserver(updateContainerSize)
        resizeObserver.observe(containerRef.value)
      }
    })

    onBeforeUnmount(() => {
      resizeObserver?.disconnect()
    })

    // ---- 从 slots 提取面板配置 ----
    function extractPanelConfigs(panelNodes: VNode[]): InternalPanelState[] {
      const count = panelNodes.length
      if (count === 0) {
        return []
      }

      const cs = containerSize.value
      const states: InternalPanelState[] = []

      // 先收集有明确大小的面板
      let totalSpecified = 0
      let unspecifiedCount = 0

      for (let i = 0; i < count; i++) {
        const p = panelNodes[i].props ?? {}
        const sizeVal = p.size ?? p.defaultSize
        const pct = sizeToPercent(sizeVal, cs)
        if (pct !== undefined) {
          totalSpecified += pct
        }
        else {
          unspecifiedCount++
        }
      }

      const remainingPerPanel = unspecifiedCount > 0
        ? Math.max(0, 100 - totalSpecified) / unspecifiedCount
        : 0

      for (let i = 0; i < count; i++) {
        const p = panelNodes[i].props ?? {}
        const sizeVal = p.size ?? p.defaultSize
        let pct = sizeToPercent(sizeVal, cs)
        if (pct === undefined) {
          pct = remainingPerPanel
        }

        const collapsible = normalizeCollapsible(p.collapsible)

        states.push({
          index: i,
          size: pct,
          min: sizeToPercent(p.min, cs) ?? 0,
          max: sizeToPercent(p.max, cs) ?? 100,
          resizable: p.resizable !== false,
          collapsible,
          collapsed: false,
          sizeBeforeCollapse: pct,
        })
      }

      return states
    }

    function syncPanelConfigs(panelNodes: VNode[]): void {
      const signature = JSON.stringify(panelNodes.map(node => node.props ?? {}))
      if (signature === panelConfigSignature.value) return
      const newPanels = extractPanelConfigs(panelNodes)
      if (panels.value.length === newPanels.length) {
        for (let i = 0; i < newPanels.length; i++) {
          newPanels[i].size = panels.value[i].size
          newPanels[i].collapsed = panels.value[i].collapsed
          newPanels[i].sizeBeforeCollapse = panels.value[i].sizeBeforeCollapse
        }
      }
      panels.value = newPanels
      panelConfigSignature.value = signature
    }

    // ---- 拖拽逻辑 ----
    let startPos = 0
    let startSizes: number[] = []

    function onDragStart(index: number, e: MouseEvent): void {
      e.preventDefault()
      if (panels.value.length < 2) {
        return
      }

      const leftPanel = panels.value[index]
      const rightPanel = panels.value[index + 1]
      if (!leftPanel?.resizable && !rightPanel?.resizable) {
        return
      }

      isDragging.value = true
      draggingIndex.value = index
      startPos = props.orientation === 'horizontal' ? e.clientX : e.clientY
      startSizes = panels.value.map((p) => p.size)

      if (props.lazy) {
        lazySizes.value = [...startSizes]
      }

      emit('resizeStart', getSizesInPx())

      document.addEventListener('mousemove', onDragMove)
      document.addEventListener('mouseup', onDragEnd)
      document.body.style.cursor = props.orientation === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    }

    function onDragMove(e: MouseEvent): void {
      if (!isDragging.value || draggingIndex.value < 0) {
        return
      }

      const currentPos = props.orientation === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - startPos
      const deltaPct = containerSize.value > 0 ? (delta / containerSize.value) * 100 : 0

      const idx = draggingIndex.value
      const [newLeft, newRight] = resizePair(idx, startSizes[idx], startSizes[idx + 1], deltaPct)

      if (props.lazy) {
        lazySizes.value[idx] = newLeft
        lazySizes.value[idx + 1] = newRight
      }
      else {
        panels.value[idx].size = newLeft
        panels.value[idx + 1].size = newRight

        // 更新折叠状态
        panels.value[idx].collapsed = newLeft <= panels.value[idx].min
        panels.value[idx + 1].collapsed = newRight <= panels.value[idx + 1].min
      }

      emit('resize', getSizesInPx())
    }

    function resizePair(index: number, leftStart: number, rightStart: number, deltaPct: number): [number, number] {
      const leftPanel = panels.value[index]
      const rightPanel = panels.value[index + 1]
      let newLeft = Math.max(leftPanel.min, Math.min(leftPanel.max, leftStart + deltaPct))
      let newRight = rightStart + leftStart - newLeft
      newRight = Math.max(rightPanel.min, Math.min(rightPanel.max, newRight))
      newLeft = leftStart + rightStart - newRight
      return [newLeft, newRight]
    }

    function onSeparatorKeydown(index: number, event: KeyboardEvent): void {
      const negativeKey = props.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
      const positiveKey = props.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
      if (event.key !== negativeKey && event.key !== positiveKey) return
      event.preventDefault()
      const step = event.shiftKey ? 10 : 1
      const delta = event.key === positiveKey ? step : -step
      const leftStart = panels.value[index].size
      const rightStart = panels.value[index + 1].size
      const [newLeft, newRight] = resizePair(index, leftStart, rightStart, delta)
      panels.value[index].size = newLeft
      panels.value[index + 1].size = newRight
      panels.value[index].collapsed = newLeft <= panels.value[index].min
      panels.value[index + 1].collapsed = newRight <= panels.value[index + 1].min
      emit('resize', getSizesInPx())
    }

    function onDragEnd(): void {
      if (props.lazy && draggingIndex.value >= 0) {
        const idx = draggingIndex.value
        panels.value[idx].size = lazySizes.value[idx]
        panels.value[idx + 1].size = lazySizes.value[idx + 1]
      }

      isDragging.value = false
      draggingIndex.value = -1

      emit('resizeEnd', getSizesInPx())

      document.removeEventListener('mousemove', onDragMove)
      document.removeEventListener('mouseup', onDragEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // ---- 折叠逻辑 ----
    function collapsePanel(panelIndex: number, direction: 'start' | 'end'): void {
      const panel = panels.value[panelIndex]
      if (!panel) {
        return
      }

      if (panel.collapsed) {
        // 展开
        const restoreSize = panel.sizeBeforeCollapse
        const delta = restoreSize - panel.size
        panel.size = restoreSize
        panel.collapsed = false
        distributeSize(-delta, panelIndex, direction === 'start' ? 'left' : 'right')
      }
      else {
        // 折叠
        panel.sizeBeforeCollapse = panel.size
        const delta = panel.size - panel.min
        panel.size = panel.min
        panel.collapsed = true
        distributeSize(delta, panelIndex, direction === 'start' ? 'left' : 'right')
      }

      emit('resize', getSizesInPx())
    }

    function distributeSize(delta: number, excludeIndex: number, direction: 'left' | 'right'): void {
      if (delta <= 0) {
        return
      }

      const candidates = direction === 'right'
        ? panels.value.filter((_, i) => i > excludeIndex)
        : panels.value.filter((_, i) => i < excludeIndex).reverse()

      let remaining = delta
      for (const panel of candidates) {
        const available = panel.max - panel.size
        const give = Math.min(available, remaining)
        panel.size += give
        remaining -= give
        if (remaining <= 0) {
          break
        }
      }
    }

    // ---- 辅助 ----
    function getSizesInPx(): number[] {
      const cs = containerSize.value
      return panels.value.map((p) => percentToPx(p.size, cs))
    }

    function flattenVNodes(vnodes: VNode[]): VNode[] {
      const result: VNode[] = []
      for (const vnode of vnodes) {
        if (vnode.type === Symbol.for('v-fgt') || (vnode.type as unknown) === Symbol.for('v-fgt')) {
          // Fragment
          if (Array.isArray(vnode.children)) {
            result.push(...flattenVNodes(vnode.children as VNode[]))
          }
        }
        else {
          result.push(vnode)
        }
      }
      return result
    }

    function isPanelVNode(vnode: VNode): boolean {
      return (vnode.type as { name?: string })?.name === 'HSplitterPanel'
        || vnode.type === SplitterPanel
    }

    // ---- 渲染 ----
    return () => {
      const vnodes = slots.default?.() ?? []
      const panelNodes = flattenVNodes(vnodes).filter(isPanelVNode)
      syncPanelConfigs(panelNodes)
      const isHorizontal = props.orientation === 'horizontal'

      const rootClass = [
        'hh-splitter',
        `hh-splitter--${props.orientation}`,
        isDragging.value && 'hh-splitter--dragging',
      ].filter(Boolean).join(' ')

      const children: VNode[] = []

      for (let i = 0; i < panelNodes.length; i++) {
        const panel = panels.value[i]
        if (!panel) {
          continue
        }

        const displaySize = props.lazy && isDragging.value
          ? lazySizes.value[i]
          : panel.size

        // 面板
        const panelStyle: CSSProperties = {
          [isHorizontal ? 'width' : 'height']: `${displaySize}%`,
          flexShrink: 0,
          flexGrow: 0,
          overflow: 'auto',
        }

        children.push(
          <div
            class={[
              'hh-splitter-panel',
              panel.collapsed && 'hh-splitter-panel--collapsed',
            ]}
            style={panelStyle}
            key={`panel-${i}`}
          >
            {typeof panelNodes[i].children === 'object'
              && panelNodes[i].children !== null
              && 'default' in (panelNodes[i].children as Record<string, unknown>)
              ? (panelNodes[i].children as Record<string, () => VNode[]>).default?.()
              : panelNodes[i].children}
          </div>,
        )

        // 分割条（不在最后一个面板后面）
        if (i < panelNodes.length - 1) {
          const nextPanel = panels.value[i + 1]
          const canDrag = panel.resizable || (nextPanel?.resizable ?? false)

          // 折叠按钮
          const leftCollapsible = panel.collapsible?.end ?? false
          const rightCollapsible = nextPanel?.collapsible?.start ?? false

          children.push(
            <div
              class={[
                'hh-splitter-bar',
                canDrag && 'hh-splitter-bar--draggable',
                draggingIndex.value === i && 'hh-splitter-bar--active',
              ]}
              key={`bar-${i}`}
              role="separator"
              tabindex={canDrag ? 0 : -1}
              aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
              aria-valuemin={panel.min}
              aria-valuemax={panel.max}
              aria-valuenow={Math.round(panel.size)}
              onMousedown={(e: MouseEvent) => canDrag && onDragStart(i, e)}
              onKeydown={(e: KeyboardEvent) => canDrag && onSeparatorKeydown(i, e)}
            >
              <div class="hh-splitter-bar__trigger">
                {leftCollapsible && (
                  <button
                    class="hh-splitter-bar__collapse-btn hh-splitter-bar__collapse-btn--start"
                    type="button"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      collapsePanel(i, 'end')
                    }}
                  >
                    <span class="hh-splitter-bar__collapse-icon">
                      {isHorizontal ? '\u25C0' : '\u25B2'}
                    </span>
                  </button>
                )}
                <div class="hh-splitter-bar__dragger" />
                {rightCollapsible && (
                  <button
                    class="hh-splitter-bar__collapse-btn hh-splitter-bar__collapse-btn--end"
                    type="button"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation()
                      collapsePanel(i + 1, 'start')
                    }}
                  >
                    <span class="hh-splitter-bar__collapse-icon">
                      {isHorizontal ? '\u25B6' : '\u25BC'}
                    </span>
                  </button>
                )}
              </div>
            </div>,
          )
        }
      }

      return (
        <div ref={containerRef} class={rootClass}>
          {children}
        </div>
      )
    }
  },
})

// 挂载 Panel 子组件
;(Splitter as Record<string, unknown>).Panel = SplitterPanel

export { Splitter }
export default Splitter
