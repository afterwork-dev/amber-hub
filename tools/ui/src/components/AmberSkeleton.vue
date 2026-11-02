<script setup lang="ts">
import { useAppearDelay } from './useAppearDelay'

export interface AmberSkeletonProps {
  label?: string
}

withDefaults(defineProps<AmberSkeletonProps>(), {
  label: 'Loading',
})

const shown = useAppearDelay(() => true)
</script>

<template>
  <div class="amber-skeleton" :class="{ 'amber-skeleton--pending': !shown }" aria-busy="true">
    <span class="amber-skeleton__label">{{ label }}</span>
    <div class="amber-skeleton__shapes" aria-hidden="true"><slot /></div>
  </div>
</template>
