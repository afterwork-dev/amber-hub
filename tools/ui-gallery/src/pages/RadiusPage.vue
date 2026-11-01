<script setup lang="ts">
import UsageNote from '../components/UsageNote.vue'
import { radius } from '../foundations'
</script>

<template>
  <UsageNote :notes="radius.notes" />
  <ul class="tiles">
    <li v-for="item in radius.items" :key="item.token">
      <div class="tile" :style="{ borderRadius: `var(--amber-${item.token})` }" />
      <div class="token-name">--amber-{{ item.token }}</div>
      <div class="token-value">{{ item.value }}</div>
      <div class="token-usage">{{ item.usage }}</div>
    </li>
  </ul>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--amber-space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  height: 120px;
  margin-bottom: var(--amber-space-2);
  border: 2px solid var(--amber-accent-500);
  background: var(--amber-accent-tint);
}
</style>
