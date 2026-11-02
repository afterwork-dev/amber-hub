<script setup lang="ts">
import { useAppearDelay } from './useAppearDelay'

export interface AmberSpinnerProps {
  size?: 16 | 20 | 32
  onAccent?: boolean
  delay?: boolean
  label?: string
}

const props = withDefaults(defineProps<AmberSpinnerProps>(), {
  size: 20,
  onAccent: false,
  delay: true,
  label: 'Loading',
})

const shown = useAppearDelay(() => props.delay)
</script>

<template>
  <span
    class="amber-spinner"
    :class="[
      `amber-spinner--${size}`,
      { 'amber-spinner--on-accent': onAccent, 'amber-spinner--pending': !shown },
    ]"
    role="progressbar"
    :aria-label="label"
  />
</template>
