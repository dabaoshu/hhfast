import { config } from '@vue/test-utils'
import { afterEach } from 'vitest'

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub

/** 保留真实 Transition，以便 Modal 离场 after-leave / 焦点还原可测 */
config.global.stubs = {
  ...config.global.stubs,
  transition: false,
  Transition: false,
}

afterEach(() => {
  document.body.innerHTML = ''
})
