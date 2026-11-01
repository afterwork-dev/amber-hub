<script setup lang="ts">
import { computed } from 'vue'
import UsageNote from '../components/UsageNote.vue'
import { GRID_COLUMNS, GRID_GUTTER, gridMargin, gridMargins, spacing } from '../foundations'
import { useFrameWidth } from '../viewports'

const frameWidth = useFrameWidth()
const margin = computed(() => `${gridMargin(frameWidth.value)}px`)
</script>

<template>
  <UsageNote :notes="spacing.notes" />
  <section class="page-section">
    <h2 class="section-title">Scale</h2>
    <ul class="bars">
      <li v-for="item in spacing.scale" :key="item.token" class="bar-row">
        <div class="bar" :style="{ width: `var(--amber-${item.token})` }" />
        <span class="token-name">--amber-{{ item.token }}</span>
        <span class="token-value">{{ item.value }}</span>
      </li>
    </ul>
  </section>

  <section class="page-section">
    <h2 class="section-title">Grid</h2>
    <p class="token-value" data-testid="grid-label">
      {{ GRID_COLUMNS }} columns · {{ GRID_GUTTER }} gutter · {{ margin }} margins
    </p>
    <div
      class="grid-overlay"
      data-testid="grid-overlay"
      :style="{
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        columnGap: 'var(--amber-space-6)',
        paddingInline: margin,
      }"
    >
      <div v-for="column in GRID_COLUMNS" :key="column" class="grid-column" />
    </div>
    <table class="margins">
      <thead>
        <tr>
          <th>Device</th>
          <th>Frame width</th>
          <th>Margin</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in gridMargins" :key="row.device">
          <td>{{ row.device }}</td>
          <td class="token-value">{{ row.breakpoint }}</td>
          <td class="token-value">{{ row.margin }}px</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.bars {
  margin: 0;
  padding: 0;
  list-style: none;
}

.bar-row {
  display: grid;
  grid-template-columns: 64px 200px auto;
  align-items: center;
  gap: var(--amber-space-4);
  padding: var(--amber-space-2) 0;
}

.bar {
  height: var(--amber-space-6);
  background: var(--amber-accent-500);
}

.grid-overlay {
  display: grid;
  height: 160px;
  margin-inline: calc(-1 * var(--frame-padding));
  margin-bottom: var(--amber-space-6);
  background: var(--amber-canvas);
}

.grid-column {
  background: var(--amber-accent-500);
  opacity: 0.2;
}

.margins {
  border-collapse: collapse;
}

.margins th,
.margins td {
  padding: var(--amber-space-2) var(--amber-space-4);
  border-bottom: 1px solid var(--amber-raised);
  text-align: left;
}

.margins th {
  color: var(--amber-text-muted);
  font-weight: 600;
}
</style>
