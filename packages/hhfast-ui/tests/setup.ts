import { afterEach } from 'vitest'

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub

afterEach(() => {
  document.body.innerHTML = ''
})
