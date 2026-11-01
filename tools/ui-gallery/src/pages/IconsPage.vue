<script setup lang="ts">
import { computed, ref } from 'vue'
import { icons } from '@amber-hub/ui/icons'
import UsageNote from '../components/UsageNote.vue'
import { iconography } from '../foundations'

const all = Object.entries(icons)
const search = ref('')
const shown = computed(() => {
  const needle = search.value.trim().toLowerCase()
  return needle ? all.filter(([name]) => name.toLowerCase().includes(needle)) : all
})
</script>

<template>
  <UsageNote :notes="iconography.notes" />
  <div class="icon-tools">
    <label class="icon-search">
      <span>Search icons</span>
      <input v-model="search" type="search" class="icon-search-input" />
    </label>
    <span class="token-value" data-testid="icon-count">{{ shown.length }} icons</span>
  </div>
  <ul v-if="shown.length" class="icon-grid">
    <li v-for="[name, icon] in shown" :key="name" class="icon-cell">
      <component :is="icon" :size="24" :stroke-width="2" aria-hidden="true" />
      <span class="icon-name">{{ name }}</span>
    </li>
  </ul>
  <p v-else class="token-usage">No icons match</p>
</template>

<style scoped>
.icon-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--amber-space-4);
  margin-bottom: var(--amber-space-6);
}

.icon-search {
  display: flex;
  align-items: center;
  gap: var(--amber-space-2);
}

.icon-search-input {
  padding: var(--amber-space-2) var(--amber-space-4);
  border: 1px solid var(--amber-border);
  border-radius: var(--amber-radius-md);
  background: var(--amber-card);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--amber-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--amber-space-2);
  padding: var(--amber-space-4) var(--amber-space-2);
  border-radius: var(--amber-radius-sm);
  background: var(--amber-card);
  color: var(--amber-text-primary);
}

.icon-name {
  color: var(--amber-text-secondary);
  font-size: var(--amber-type-caption-size);
  line-height: var(--amber-type-caption-line-height);
  overflow-wrap: anywhere;
  text-align: center;
}
</style>
