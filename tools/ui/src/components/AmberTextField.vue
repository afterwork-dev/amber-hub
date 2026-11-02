<script setup lang="ts">
import type { Component } from 'vue'
import { useField } from './useField'

export interface AmberTextFieldProps {
  modelValue?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date'
  label?: string
  ariaLabel?: string
  hint?: string
  error?: string
  disabled?: boolean
  placeholder?: string
  leadingIcon?: Component
  id?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AmberTextFieldProps>(), {
  modelValue: '',
  type: 'text',
  label: undefined,
  ariaLabel: undefined,
  hint: undefined,
  error: undefined,
  disabled: false,
  placeholder: undefined,
  leadingIcon: undefined,
  id: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { controlId, hasError, hintId, errorId, describedBy } = useField('AmberTextField', props)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div
    class="amber-text-field"
    :class="[
      $attrs.class,
      {
        'amber-text-field--error': hasError,
        'amber-text-field--disabled': disabled,
      },
    ]"
    :style="$attrs.style as string"
  >
    <label v-if="label" class="amber-field__label" :for="controlId">{{ label }}</label>
    <div class="amber-field__box">
      <component
        :is="leadingIcon"
        v-if="leadingIcon"
        class="amber-text-field__icon"
        aria-hidden="true"
        :size="20"
      />
      <input
        v-bind="{ ...$attrs, class: undefined, style: undefined }"
        :id="controlId"
        class="amber-text-field__input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-label="!label && ariaLabel ? ariaLabel : undefined"
        :aria-describedby="describedBy"
        :aria-invalid="hasError ? 'true' : undefined"
        @input="onInput"
      />
    </div>
    <p v-if="hint" :id="hintId" class="amber-field__hint">{{ hint }}</p>
    <p v-if="hasError" :id="errorId" class="amber-field__error">{{ error }}</p>
  </div>
</template>
