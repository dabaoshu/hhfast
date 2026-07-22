import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { HPopover } from '../src/components/popover'

describe('HPopover accessibility', () => {
  it('links a click trigger to the expanded dialog', async () => {
    const wrapper = mount(HPopover, {
      attachTo: document.body,
      props: { trigger: 'click', content: 'Actions' },
      slots: { default: '<button>Open actions</button>' },
    })
    const reference = wrapper.get('.hh-popover-reference')

    expect(reference.attributes('aria-expanded')).toBe('false')
    const popupId = reference.attributes('aria-controls')
    expect(popupId).toBeTruthy()

    await wrapper.get('.hh-popover-wrapper').trigger('click')
    await nextTick()

    expect(reference.attributes('aria-expanded')).toBe('true')
    const popup = document.getElementById(popupId)
    expect(popup?.getAttribute('role')).toBe('dialog')
    expect(popup?.textContent).toContain('Actions')
  })
})
