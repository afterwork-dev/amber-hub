<script setup lang="ts">
export interface AmberBadgeProps {
  status?: 'success' | 'warning' | 'error' | 'info'
}

withDefaults(defineProps<AmberBadgeProps>(), {
  status: undefined,
})
</script>

<template>
  <span class="amber-badge" :class="status ? `amber-badge--${status}` : undefined"><slot /></span>
</template>
