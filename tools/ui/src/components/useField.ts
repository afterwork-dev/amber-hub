import { computed, useId, warn, watch } from 'vue'

export interface FieldProps {
  label?: string
  ariaLabel?: string
  hint?: string
  error?: string
  id?: string
}

// useId() only counts within one Vue app, and every app that inlines AmberUI has its own, so a
// module counter keeps generated ids unique across apps on the same page.
let instanceCount = 0

// Shared id, label and aria wiring for the AmberUI field components (text field, select).
export function useField(component: string, props: FieldProps) {
  const generatedId = `${useId()}-${instanceCount++}`
  const controlId = computed(() => props.id || generatedId)
  const hasError = computed(() => typeof props.error === 'string' && props.error !== '')
  const hintId = computed(() => `${controlId.value}-hint`)
  const errorId = computed(() => `${controlId.value}-error`)
  const describedBy = computed(() => {
    const ids = [props.hint ? hintId.value : '', hasError.value ? errorId.value : '']
    return ids.filter(Boolean).join(' ') || undefined
  })

  watch(
    () => [props.label, props.ariaLabel],
    ([label, ariaLabel]) => {
      if (!label && !ariaLabel) {
        warn(`${component} requires a label or an aria-label`)
      }
    },
    { immediate: true },
  )

  return { controlId, hasError, hintId, errorId, describedBy }
}
