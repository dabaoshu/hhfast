/// <reference types="vue/jsx" />
import { defineComponent, type PropType } from 'vue'
import type { SplitterCollapsible, SplitterSize } from './types'

/**
 * Splitter.Panel 子组件。
 *
 * 仅作为 Splitter 的声明式子元素使用，
 * 实际渲染由 Splitter 主组件统一控制。
 */

export const splitterPanelProps = {
  /** 受控大小。 */
  size: {
    type: [Number, String] as PropType<SplitterSize>,
    default: undefined,
  },
  /** 初始大小。 */
  defaultSize: {
    type: [Number, String] as PropType<SplitterSize>,
    default: undefined,
  },
  /** 最小尺寸。 */
  min: {
    type: [Number, String] as PropType<SplitterSize>,
    default: undefined,
  },
  /** 最大尺寸。 */
  max: {
    type: [Number, String] as PropType<SplitterSize>,
    default: undefined,
  },
  /** 是否可调整大小。 */
  resizable: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  /** 是否可折叠。 */
  collapsible: {
    type: [Boolean, Object] as PropType<boolean | SplitterCollapsible>,
    default: false,
  },
} as const

const SplitterPanel = defineComponent({
  name: 'HSplitterPanel',
  props: splitterPanelProps,
  setup(_, { slots }) {
    return () => (
      <div class="hh-splitter-panel">
        {slots.default?.()}
      </div>
    )
  },
})

export { SplitterPanel }
export default SplitterPanel
