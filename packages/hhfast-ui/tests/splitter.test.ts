import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Splitter, SplitterPanel } from '../src/components/splitter'

describe('HSplitter keyboard access', () => {
  it('exposes a separator and resizes adjacent panels with arrow keys', async () => {
    const wrapper = mount(Splitter, {
      slots: {
        default: () => [
          h(SplitterPanel, { defaultSize: '50%', min: '20%' }, () => 'A'),
          h(SplitterPanel, { defaultSize: '50%', min: '20%' }, () => 'B'),
        ],
      },
    })
    Object.defineProperty(wrapper.element, 'getBoundingClientRect', {
      value: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
    })
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    const separator = wrapper.get('.hh-splitter-bar')
    expect(separator.attributes('role')).toBe('separator')
    expect(separator.attributes('tabindex')).toBe('0')
    expect(separator.attributes('aria-orientation')).toBe('vertical')
    expect(separator.attributes('aria-valuenow')).toBe('50')

    await separator.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.findAll('.hh-splitter-panel')[0].attributes('style')).toContain('51%')
    expect(wrapper.emitted('resize')).toHaveLength(1)
  })
})
