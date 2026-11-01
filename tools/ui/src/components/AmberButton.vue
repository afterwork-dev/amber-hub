<script setup lang="ts">
import { computed, type Component } from 'vue'

export interface AmberButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  disabled?: boolean
  loading?: boolean
  href?: string
  leadingIcon?: Component
  trailingIcon?: Component
  surface?: 'canvas' | 'base' | 'card' | 'raised'
}

const props = withDefaults(defineProps<AmberButtonProps>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  loading: false,
  href: undefined,
  leadingIcon: undefined,
  trailingIcon: undefined,
  surface: 'card',
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const isLink = computed(() => props.href !== undefined)
const iconSize = computed(() => (props.size === 'sm' ? 16 : 20))

function onClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    if (isLink.value) event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="isLink ? 'a' : 'button'"
    :type="isLink ? undefined : 'button'"
    :href="isLink && !disabled ? href : undefined"
    :disabled="!isLink && disabled ? true : undefined"
    :aria-disabled="isLink && disabled ? 'true' : undefined"
    :tabindex="isLink && disabled ? -1 : undefined"
    :aria-busy="loading ? 'true' : undefined"
    class="amber-button"
    :class="[
      `amber-button--${variant}`,
      {
        'amber-button--sm': size === 'sm',
        'amber-button--loading': loading,
        'amber-button--disabled': disabled,
        'amber-button--on-raised': surface === 'raised',
      },
    ]"
    @click="onClick"
  >
    <component
      :is="leadingIcon"
      v-if="leadingIcon"
      class="amber-button__icon"
      aria-hidden="true"
      :size="iconSize"
    />
    <span class="amber-button__label"><slot /></span>
    <component
      :is="trailingIcon"
      v-if="trailingIcon"
      class="amber-button__icon"
      aria-hidden="true"
      :size="iconSize"
    />
    <span v-if="loading" class="amber-button__spinner" aria-hidden="true" />
  </component>
</template>
