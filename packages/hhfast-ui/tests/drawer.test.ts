import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import {
  closeAllDrawers,
  drawer,
  HDrawer,
  HDrawerLayer,
  openDrawer,
} from '../src/components/drawer'

afterEach(() => closeAllDrawers())

async function waitLeave(): Promise<void> {
  await new Promise((r) => setTimeout(r, 280))
}

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
    await waitLeave()
    await nextTick()
    expect(document.activeElement).toBe(opener)
  })
})

describe('drawer command stack', () => {
  it('opens via openDrawer and closes on Escape through HDrawerLayer', async () => {
    mount(HDrawerLayer, { attachTo: document.body })
    openDrawer({
      title: 'Stack drawer',
      content: () => h('p', 'body'),
      showConfirm: false,
      showCancel: false,
    })
    await nextTick()
    await nextTick()

    expect(document.querySelector('.hh-drawer-panel')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await waitLeave()
    expect(document.querySelector('.hh-drawer-panel')).toBeNull()
  })

  it('respects per-record placement defaults from createDrawer factory', async () => {
    const id = drawer.open({
      title: 'Right default',
      content: () => h('p', 'x'),
      showConfirm: false,
      showCancel: false,
    })
    expect(id).toBeTruthy()
    mount(HDrawerLayer, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.hh-drawer--right')).not.toBeNull()
    closeAllDrawers()
  })
})
