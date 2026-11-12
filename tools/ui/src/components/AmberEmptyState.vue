<script setup lang="ts">
import type { Component } from 'vue'

export interface AmberEmptyStateProps {
  icon: Component
  title: string
  description?: string
}

withDefaults(defineProps<AmberEmptyStateProps>(), {
  description: undefined,
})
</script>

<template>
  <div class="amber-empty-state">
    <component :is="icon" class="amber-empty-state__icon" aria-hidden="true" :size="40" />
    <div class="amber-empty-state__title">{{ title }}</div>
    <div v-if="description" class="amber-empty-state__description">{{ description }}</div>
    <div v-if="$slots.action" class="amber-empty-state__action"><slot name="action" /></div>
  </div>
</template>
