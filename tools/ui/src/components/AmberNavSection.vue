<script lang="ts">
// useId() only counts within one Vue app, so a module counter keeps the label id unique across
// apps on the same page (as in useField.ts).
let sectionCount = 0
</script>

<script setup lang="ts">
import { useId } from 'vue'

export interface AmberNavSectionProps {
  label: string
}

defineProps<AmberNavSectionProps>()

const labelId = `${useId()}-${sectionCount++}`
</script>

<template>
  <div class="amber-nav-section" role="group" :aria-labelledby="labelId">
    <div :id="labelId" class="amber-nav-section__label">{{ label }}</div>
    <slot />
  </div>
</template>
