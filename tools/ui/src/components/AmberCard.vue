<script setup lang="ts">
export interface AmberCardProps {
  panel?: boolean
}

withDefaults(defineProps<AmberCardProps>(), {
  panel: false,
})
</script>

<template>
  <div class="amber-card" :class="{ 'amber-card--panel': panel }">
    <div v-if="$slots.title" class="amber-card__title"><slot name="title" /></div>
    <div v-if="$slots.default" class="amber-card__body"><slot /></div>
    <div v-if="$slots.actions" class="amber-card__actions"><slot name="actions" /></div>
  </div>
</template>
