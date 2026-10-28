import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAvailableHeight } from '../useAvailableHeight'

const observe = vi.fn()
const disconnect = vi.fn()

class ResizeObserverSpy {
  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
}

/** Stands in for the ShadowRoot host: the composable only ever reads its bounding rect. */
function createHost(top: number): Element {
  return { getBoundingClientRect: () => ({ top }) } as unknown as Element
}

function setViewportHeight(height: number): void {
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
}

describe('useAvailableHeight', () => {
  beforeEach(() => {
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal('ResizeObserver', ResizeObserverSpy)
    setViewportHeight(1000)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('measures the space left below the host element', () => {
    const { height, stop } = useAvailableHeight(createHost(220))

    expect(height.value).toBe(780)
    stop()
  })

  it('subtracts the gutter so the app stops short of the page edge', () => {
    const { height, stop } = useAvailableHeight(createHost(220), 16)

    expect(height.value).toBe(764)
    stop()
  })

  it('never reports a negative height when the host is scrolled past the viewport', () => {
    const { height, stop } = useAvailableHeight(createHost(1400))

    expect(height.value).toBe(0)
    stop()
  })

  it('re-measures when the viewport resizes', () => {
    const { height, stop } = useAvailableHeight(createHost(200))
    expect(height.value).toBe(800)

    setViewportHeight(600)
    window.dispatchEvent(new Event('resize'))

    expect(height.value).toBe(400)
    stop()
  })

  it('observes the document element so Hub layout changes are picked up', () => {
    const { stop } = useAvailableHeight(createHost(200))

    expect(observe).toHaveBeenCalledWith(document.documentElement)
    stop()
  })

  it('still works where ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined)

    const { height, stop } = useAvailableHeight(createHost(200))
    expect(height.value).toBe(800)

    setViewportHeight(600)
    window.dispatchEvent(new Event('resize'))
    expect(height.value).toBe(400)

    expect(() => stop()).not.toThrow()
  })

  it('leaves nothing behind after stop', () => {
    const { height, stop } = useAvailableHeight(createHost(200))

    stop()
    setViewportHeight(500)
    window.dispatchEvent(new Event('resize'))

    expect(disconnect).toHaveBeenCalledOnce()
    expect(height.value).toBe(800)
  })
})
