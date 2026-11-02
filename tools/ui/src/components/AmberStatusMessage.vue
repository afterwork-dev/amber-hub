<script setup lang="ts">
import { computed } from 'vue'
import { CircleAlert, CircleCheck, CircleX, Info, X } from '../icons'

export interface AmberStatusMessageProps {
  variant?: 'success' | 'warning' | 'error' | 'info'
  dismissible?: boolean
  dismissLabel?: string
}

const props = withDefaults(defineProps<AmberStatusMessageProps>(), {
  variant: 'info',
  dismissible: false,
  dismissLabel: 'Dismiss',
})

const emit = defineEmits<{ dismiss: [] }>()

const icons = { success: CircleCheck, warning: CircleAlert, error: CircleX, info: Info }
const role = computed(() =>
  props.variant === 'warning' || props.variant === 'error' ? 'alert' : 'status',
)
</script>

<template>
  <div :class="`amber-status-message amber-status-message--${variant}`" :role="role">
    <component
      :is="icons[variant]"
      class="amber-status-message__icon"
      aria-hidden="true"
      :size="24"
    />
    <div class="amber-status-message__text"><slot /></div>
    <button
      v-if="dismissible"
      type="button"
      class="amber-status-message__dismiss"
      :aria-label="dismissLabel"
      @click="emit('dismiss')"
    >
      <X aria-hidden="true" :size="20" />
    </button>
  </div>
</template>
