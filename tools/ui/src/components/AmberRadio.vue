<script setup lang="ts">
import { computed, inject, warn } from 'vue'
import { radioGroupKey } from './radioGroup'
import { useField } from './useField'

export interface AmberRadioProps {
  value: string | number
  label?: string
  ariaLabel?: string
  disabled?: boolean
  id?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AmberRadioProps>(), {
  label: undefined,
  ariaLabel: undefined,
  disabled: false,
  id: undefined,
})

const { controlId } = useField('AmberRadio', props)

const group = inject(radioGroupKey, null)
if (!group) warn('AmberRadio must be used inside AmberRadioGroup')

const isDisabled = computed(() => props.disabled || !!group?.disabled.value)
const checked = computed(() => !!group && group.modelValue.value === props.value)

function onChange() {
  group?.select(props.value)
}
</script>

<template>
  <label
    class="amber-choice amber-radio"
    :class="[$attrs.class, { 'amber-choice--disabled': isDisabled }]"
    :style="$attrs.style as string"
  >
    <input
      v-bind="{ ...$attrs, class: undefined, style: undefined }"
      :id="controlId"
      class="amber-choice__input"
      type="radio"
      :name="group?.name.value"
      :checked="checked"
      :disabled="isDisabled"
      :aria-label="!label && ariaLabel ? ariaLabel : undefined"
      @change="onChange"
    />
    <span class="amber-radio__circle" aria-hidden="true"></span>
    <span v-if="label" class="amber-choice__label">{{ label }}</span>
  </label>
</template>
