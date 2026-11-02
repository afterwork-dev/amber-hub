<script setup lang="ts">
import { useField } from './useField'

export interface AmberSwitchProps {
  modelValue?: boolean
  label?: string
  ariaLabel?: string
  disabled?: boolean
  id?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AmberSwitchProps>(), {
  modelValue: false,
  label: undefined,
  ariaLabel: undefined,
  disabled: false,
  id: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { controlId } = useField('AmberSwitch', props)

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label
    class="amber-choice amber-switch"
    :class="[$attrs.class, { 'amber-choice--disabled': disabled }]"
    :style="$attrs.style as string"
  >
    <input
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :id="controlId"
      class="amber-choice__input"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      :aria-checked="modelValue ? 'true' : 'false'"
      :disabled="disabled"
      :aria-label="!label && ariaLabel ? ariaLabel : undefined"
      @change="onChange"
    />
    <span class="amber-switch__track" aria-hidden="true">
      <span class="amber-switch__knob"></span>
    </span>
    <span v-if="label" class="amber-choice__label">{{ label }}</span>
  </label>
</template>
