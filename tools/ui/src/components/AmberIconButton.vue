<script setup lang="ts">
import { warn, watch, type Component } from 'vue'

export interface AmberIconButtonProps {
  icon: Component
  ariaLabel: string
  dot?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<AmberIconButtonProps>(), {
  dot: false,
  disabled: false,
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

watch(
  () => props.ariaLabel,
  (label) => {
    if (typeof label !== 'string' || label.trim() === '') {
      warn('AmberIconButton requires a non-empty aria-label')
    }
  },
  { immediate: true },
)
</script>

<template>
  <button
    type="button"
    class="amber-icon-button"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="emit('click', $event)"
  >
    <component :is="icon" aria-hidden="true" :size="20" />
    <span v-if="dot" class="amber-icon-button__dot" aria-hidden="true" />
  </button>
</template>
