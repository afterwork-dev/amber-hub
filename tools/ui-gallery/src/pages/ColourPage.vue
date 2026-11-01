<script setup lang="ts">
import UsageNote from '../components/UsageNote.vue'
import { colour } from '../foundations'
</script>

<template>
  <UsageNote :notes="colour.notes" />
  <section v-for="group in colour.groups" :key="group.title" class="page-section">
    <h2 class="section-title">{{ group.title }}</h2>
    <ul class="swatches">
      <li v-for="item in group.items" :key="item.token" class="swatch-item">
        <div
          class="swatch"
          data-testid="swatch"
          :style="{ backgroundColor: `var(--amber-${item.token})` }"
        />
        <div class="token-name">--amber-{{ item.token }}</div>
        <div class="token-value">{{ item.value }}</div>
        <div class="token-usage">{{ item.usage }}</div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--amber-space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.swatch {
  height: 96px;
  margin-bottom: var(--amber-space-2);
  border: 1px solid var(--amber-raised);
  border-radius: var(--amber-radius-lg);
}
</style>
