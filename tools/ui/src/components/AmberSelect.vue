<script setup lang="ts" generic="T extends string | number">
import { ChevronDown } from '../icons'
import { useField } from './useField'

export interface AmberSelectItem<T extends string | number> {
  value: T
  label: string
  disabled?: boolean
}

export interface AmberSelectProps<T extends string | number = string | number> {
  items: AmberSelectItem<T>[]
  modelValue?: T
  label?: string
  ariaLabel?: string
  hint?: string
  error?: string
  disabled?: boolean
  id?: string
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AmberSelectProps<T>>(), {
  modelValue: undefined,
  label: undefined,
  ariaLabel: undefined,
  hint: undefined,
  error: undefined,
  disabled: false,
  id: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const { controlId, hasError, hintId, errorId, describedBy } = useField('AmberSelect', props)

function onChange(event: Event) {
  const item = props.items[(event.target as HTMLSelectElement).selectedIndex]
  if (item) emit('update:modelValue', item.value)
}
</script>

<template>
  <div
    class="amber-select"
    :class="[
      $attrs.class,
      {
        'amber-select--error': hasError,
        'amber-select--disabled': disabled,
      },
    ]"
    :style="$attrs.style as string"
  >
    <label v-if="label" class="amber-field__label" :for="controlId">{{ label }}</label>
    <div class="amber-field__box">
      <select
        v-bind="{ ...$attrs, class: undefined, style: undefined }"
        :id="controlId"
        class="amber-select__control"
        :value="modelValue"
        :disabled="disabled"
        :aria-label="!label && ariaLabel ? ariaLabel : undefined"
        :aria-describedby="describedBy"
        :aria-invalid="hasError ? 'true' : undefined"
        @change="onChange"
      >
        <option
          v-for="item in items"
          :key="item.value"
          :value="item.value"
          :disabled="item.disabled"
        >
          {{ item.label }}
        </option>
      </select>
      <ChevronDown class="amber-select__chevron" aria-hidden="true" :size="20" />
    </div>
    <p v-if="hint" :id="hintId" class="amber-field__hint">{{ hint }}</p>
    <p v-if="hasError" :id="errorId" class="amber-field__error">{{ error }}</p>
  </div>
</template>
