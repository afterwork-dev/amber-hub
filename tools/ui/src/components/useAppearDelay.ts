import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

const APPEAR_DELAY_MS = 300

// Whether the element should be shown. When delayed, it turns true 300ms after mount, so fast
// loads don't flicker.
export function useAppearDelay(delayed: () => boolean): Ref<boolean> {
  const shown = ref(!delayed())
  let timer: ReturnType<typeof setTimeout> | undefined

  onMounted(() => {
    if (shown.value) return
    timer = setTimeout(() => {
      shown.value = true
    }, APPEAR_DELAY_MS)
  })

  onBeforeUnmount(() => clearTimeout(timer))

  return shown
}
