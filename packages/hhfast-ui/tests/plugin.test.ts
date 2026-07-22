import { describe, expect, it, vi } from 'vitest'
import type { App, Component, Directive } from 'vue'
import { HhfastUi } from '../src'

describe('HhfastUi plugin', () => {
  it('registers every template-facing component and directive', () => {
    const components = new Map<string, Component>()
    const directives = new Map<string, Directive>()
    const app = {
      component: vi.fn((name: string, component: Component) => {
        components.set(name, component)
        return app
      }),
      directive: vi.fn((name: string, directive: Directive) => {
        directives.set(name, directive)
        return app
      }),
    } as unknown as App

    HhfastUi.install?.(app)

    expect([...components.keys()]).toEqual([
      'HTable',
      'HTooltip',
      'HPopover',
      'HSplitter',
      'HSplitterPanel',
      'HConfigProvider',
      'HDrawer',
      'HTree',
    ])
    expect([...directives.keys()]).toEqual(['tooltip'])
  })
})
