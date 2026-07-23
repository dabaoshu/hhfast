import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { closeAllModals, HModalLayer, openModal } from '../src/components/modal'
import {
  isTopHModalInstance,
  registerHModalInstance,
  unregisterHModalInstance,
} from '../src/components/modal/hModalRegistry'

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

    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
