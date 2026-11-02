import type { InjectionKey, Ref } from 'vue'

export interface RadioGroupContext {
  name: Ref<string>
  modelValue: Ref<string | number | undefined>
  disabled: Ref<boolean>
  select: (value: string | number) => void
}

export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('amber-radio-group')

// Same reason as the module counter in useField.ts: useId() alone is not unique across apps.
let groupCount = 0
export function nextGroupId() {
  return groupCount++
}
