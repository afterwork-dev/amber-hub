class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

window.visualViewport ??= {
  addEventListener: () => {},
  removeEventListener: () => {},
} as unknown as VisualViewport
