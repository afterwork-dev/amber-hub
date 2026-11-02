<script setup lang="ts" generic="T extends string | number">
import { computed, provide, useAttrs, useId, useTemplateRef, warn, watch } from 'vue'
import { nextGroupId, radioGroupKey } from './radioGroup'

export interface AmberRadioGroupProps<T extends string | number = string | number> {
  modelValue?: T
  label?: string
  ariaLabel?: string
  name?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<AmberRadioGroupProps<T>>(), {
  modelValue: undefined,
  label: undefined,
  ariaLabel: undefined,
  name: undefined,
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const attrs = useAttrs()

const generatedId = `${useId()}-${nextGroupId()}`
const labelId = `${generatedId}-label`
const groupName = computed(() => props.name || `amber-radio-group-${generatedId}`)

provide(radioGroupKey, {
  name: groupName,
  modelValue: computed(() => props.modelValue),
  disabled: computed(() => props.disabled),
  select: (value) => emit('update:modelValue', value as T),
})

watch(
  () => [props.label, props.ariaLabel, attrs['aria-labelledby']],
  ([label, ariaLabel, labelledBy]) => {
    if (!label && !ariaLabel && !labelledBy) {
      warn('AmberRadioGroup requires a label, an aria-label or an aria-labelledby')
    }
  },
  { immediate: true },
)

const root = useTemplateRef<HTMLElement>('root')

function onKeydown(event: KeyboardEvent) {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
  const from = event.target
  if (!step || !(from instanceof HTMLInputElement) || from.type !== 'radio') return
  const radios = [...(root.value?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [])]
  const enabled = radios.filter((radio) => !radio.disabled)
  const index = enabled.indexOf(from)
  if (index === -1) return
  event.preventDefault()
  const target = enabled[(index + step + enabled.length) % enabled.length]
  target?.focus()
  target?.click()
}
</script>

<template>
  <div
    ref="root"
    role="radiogroup"
    class="amber-radio-group"
    :aria-labelledby="label ? labelId : undefined"
    :aria-label="!label && ariaLabel ? ariaLabel : undefined"
    @keydown="onKeydown"
  >
    <div v-if="label" :id="labelId" class="amber-radio-group__label">{{ label }}</div>
    <slot />
  </div>
</template>
