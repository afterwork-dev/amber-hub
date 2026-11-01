<script setup lang="ts">
import UsageNote from '../components/UsageNote.vue'
import { elevation } from '../foundations'
</script>

<template>
  <UsageNote :notes="elevation.notes" />
  <ul class="cards">
    <li
      v-for="item in elevation.items"
      :key="item.token"
      class="card"
      :style="{
        backgroundColor: `var(--amber-${item.surface})`,
        boxShadow: `var(--amber-${item.token})`,
      }"
    >
      <div class="token-name">--amber-{{ item.token }}</div>
      <div class="token-value">{{ item.value }}</div>
      <div class="token-value">surface: --amber-{{ item.surface }}</div>
      <div class="token-usage">{{ item.usage }}</div>
    </li>
  </ul>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--amber-space-8);
  margin: 0;
  padding: var(--amber-space-8);
  border-radius: var(--amber-radius-xl);
  background: var(--amber-canvas);
  list-style: none;
}

.card {
  min-height: 140px;
  padding: var(--amber-space-6);
  border-radius: var(--amber-radius-lg);
}
</style>
