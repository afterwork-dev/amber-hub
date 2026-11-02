<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue'
import { Check, Minus } from '../icons'
import { useField } from './useField'

export interface AmberCheckboxProps {
  modelValue?: boolean
  indeterminate?: boolean
  label?: string
  ariaLabel?: string
  disabled?: boolean
  id?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AmberCheckboxProps>(), {
  modelValue: false,
  indeterminate: false,
  label: undefined,
  ariaLabel: undefined,
  disabled: false,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:indeterminate': [value: boolean]
}>()

const { controlId } = useField('AmberCheckbox', props)

const input = useTemplateRef<HTMLInputElement>('input')

// indeterminate is a DOM property only, so it is set from the prop rather than bound.
function syncIndeterminate() {
  if (input.value) input.value.indeterminate = props.indeterminate
}

onMounted(syncIndeterminate)
watch(() => props.indeterminate, syncIndeterminate, { flush: 'post' })

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
  if (props.indeterminate) emit('update:indeterminate', false)
  // The browser clears the DOM property on a click; the prop stays the source of truth.
  syncIndeterminate()
}
</script>

<template>
  <label
    class="amber-choice amber-checkbox"
    :class="[$attrs.class, { 'amber-choice--disabled': disabled }]"
    :style="$attrs.style as string"
  >
    <input
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :id="controlId"
      ref="input"
      class="amber-choice__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="!label && ariaLabel ? ariaLabel : undefined"
      @change="onChange"
    />
    <span class="amber-checkbox__box" aria-hidden="true">
      <Minus v-if="indeterminate" class="amber-checkbox__icon" :size="14" />
      <Check v-else-if="modelValue" class="amber-checkbox__icon" :size="14" />
    </span>
    <span v-if="label" class="amber-choice__label">{{ label }}</span>
  </label>
</template>
