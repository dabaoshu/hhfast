import { h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { closeAllModals, HModal, HModalLayer, openModal } from '../src/components/modal'
import {
  isTopHModalInstance,
  registerHModalInstance,
  unregisterHModalInstance,
} from '../src/components/modal/hModalRegistry'

/** 等待离场 Transition（0.2s）结束 */
async function waitLeave(): Promise<void> {
  await new Promise((r) => setTimeout(r, 250))
}

describe('hModalRegistry', () => {
  it('treats the highest zIndex instance as top', () => {
    const low = registerHModalInstance(1000)
    const high = registerHModalInstance(1010)
    expect(isTopHModalInstance(high)).toBe(true)
    expect(isTopHModalInstance(low)).toBe(false)
    unregisterHModalInstance(high)
    expect(isTopHModalInstance(low)).toBe(true)
    unregisterHModalInstance(low)
  })

  it('prefers the later registration when zIndex ties', () => {
    const first = registerHModalInstance(1000)
    const second = registerHModalInstance(1000)
    expect(isTopHModalInstance(second)).toBe(true)
    unregisterHModalInstance(second)
    unregisterHModalInstance(first)
  })
})

afterEach(() => closeAllModals())

describe('HModal declarative', () => {
  it('toggles with v-model and does not auto-close on confirm', async () => {
    const visible = ref(true)
    const onConfirm = vi.fn()
    const wrapper = mount(
      {
        components: { HModal },
        setup() {
          return { visible, onConfirm }
        },
        template: `
          <HModal v-model="visible" title="Edit" @confirm="onConfirm">
            <p>body</p>
          </HModal>
        `,
      },
      { attachTo: document.body },
    )
    try {
      await nextTick()
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()
      expect(document.querySelector('.hh-modal-title')?.textContent).toContain('Edit')

      const confirmBtn = document.querySelector<HTMLButtonElement>('.hh-modal-btn--confirm')
      expect(confirmBtn).not.toBeNull()
      confirmBtn?.click()
      await nextTick()
      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(visible.value).toBe(true)
      expect(document.querySelector('[role="dialog"]')).not.toBeNull()

      const cancelBtn = document.querySelector<HTMLButtonElement>('.hh-modal-btn--cancel')
      expect(cancelBtn).not.toBeNull()
      cancelBtn?.click()
      await nextTick()
      expect(visible.value).toBe(false)
      await waitLeave()
      expect(document.querySelector('[role="dialog"]')).toBeNull()
    }
    finally {
      wrapper.unmount()
    }
  })

  it('closes on Escape only for the top zIndex instance', async () => {
    const lowOpen = ref(true)
    const highOpen = ref(true)
    const wrapper = mount(
      {
        components: { HModal },
        setup() {
          return { lowOpen, highOpen }
        },
        template: `
          <HModal v-model="lowOpen" title="Low" :z-index="1000" :show-confirm="false" :show-cancel="false" />
          <HModal v-model="highOpen" title="High" :z-index="1100" :show-confirm="false" :show-cancel="false" />
        `,
      },
      { attachTo: document.body },
    )
    try {
      await nextTick()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(highOpen.value).toBe(false)
      expect(lowOpen.value).toBe(true)
      await waitLeave()
    }
    finally {
      wrapper.unmount()
    }
  })

  it('moves dialog when dragging the header if draggable', async () => {
    const visible = ref(true)
    const wrapper = mount(
      {
        components: { HModal },
        setup() {
          return { visible }
        },
        template: `
          <HModal v-model="visible" title="Drag me" draggable :show-confirm="false" :show-cancel="false" />
        `,
      },
      { attachTo: document.body },
    )
    try {
      await nextTick()
      const header = document.querySelector<HTMLElement>('.hh-modal-header')
      const dialog = document.querySelector<HTMLElement>('.hh-modal-dialog')
      expect(header).not.toBeNull()
      expect(dialog).not.toBeNull()

      header!.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 100, clientY: 100, bubbles: true }))
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 140, clientY: 130, bubbles: true }))
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await nextTick()

      expect(dialog!.style.getPropertyValue('--hh-modal-dx')).toBe('40px')
      expect(dialog!.style.getPropertyValue('--hh-modal-dy')).toBe('30px')
    }
    finally {
      wrapper.unmount()
    }
  })
})

describe('HModalLayer accessibility', () => {
  it('labels the dialog, moves focus inside, closes on Escape, and restores focus', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    mount(HModalLayer, { attachTo: document.body })

    openModal({ title: 'Delete item', content: () => h('p', 'Confirm deletion') })
    await nextTick()
    await nextTick()

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    const labelledBy = dialog?.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy ?? '')?.textContent).toContain('Delete item')
    expect(document.querySelector('.hh-modal-close-btn')?.getAttribute('aria-label')).toBe('关闭弹层')
    expect(dialog?.contains(document.activeElement)).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await waitLeave()
    await nextTick()

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
