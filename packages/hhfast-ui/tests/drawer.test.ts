import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { HDrawer } from '../src/components/drawer'

describe('HDrawer accessibility', () => {
  it('labels the dialog, constrains its size, and restores focus after Escape', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const wrapper = mount(HDrawer, {
      attachTo: document.body,
      props: { open: false, title: 'Filters', width: 800 },
      slots: { default: '<button>Apply</button>' },
    })

    await wrapper.setProps({ open: true })
    await nextTick()

    const dialog = document.querySelector<HTMLElement>('.hh-drawer-panel')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    const labelledBy = dialog?.getAttribute('aria-labelledby')
    expect(document.getElementById(labelledBy ?? '')?.textContent).toContain('Filters')
    expect(document.querySelector('.hh-drawer-close')?.getAttribute('aria-label')).toBe('关闭抽屉')
    expect(dialog?.style.maxWidth).toBe('100vw')
    expect(dialog?.contains(document.activeElement)).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    await wrapper.setProps({ open: false })
    await nextTick()
    expect(document.activeElement).toBe(opener)
  })
})
