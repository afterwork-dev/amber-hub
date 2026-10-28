// jsdom implements neither ResizeObserver nor visualViewport, and Vuetify's layout components
// use both. Mirrors the Hub's own frontend test setup.
//
// This file also loads for the node-environment backend tests, where there is no DOM at all —
// hence the guard.
if (typeof window !== 'undefined') {
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
}
