import { ref, type Ref } from 'vue'

export interface AvailableHeight {
  height: Ref<number>
  stop: () => void
}

/**
 * The Hub mounts apps into an auto-height container, so `height: 100%` resolves to zero and no
 * pure-CSS rule can make the app fill the rest of the page. Measure what is actually left below
 * the app's host element instead.
 *
 * Reads `host` only. Every write goes inside the app's own ShadowRoot, so the Hub's DOM is never
 * touched. Call `stop` on unmount — nothing should outlive the visit.
 */
export function useAvailableHeight(host: Element, gutter = 0): AvailableHeight {
  const height = ref(0)

  function measure(): void {
    const { top } = host.getBoundingClientRect()
    height.value = Math.max(0, window.innerHeight - top - gutter)
  }

  measure()
  window.addEventListener('resize', measure)

  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
  observer?.observe(document.documentElement)

  function stop(): void {
    window.removeEventListener('resize', measure)
    observer?.disconnect()
  }

  return { height, stop }
}
