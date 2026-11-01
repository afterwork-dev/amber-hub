<script setup lang="ts">
import { AmberButton, AmberIconButton } from '@amber-hub/ui'
import { ArrowRight, Bell, Plus } from '@amber-hub/ui/icons'

const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
const sizes = [
  { id: 'md', label: 'Default size' },
  { id: 'sm', label: 'Size sm' },
] as const
const setups = [
  { id: 'none', label: 'No icon' },
  { id: 'leading', label: 'Leading icon' },
  { id: 'trailing', label: 'Trailing icon' },
] as const
const states = [
  { id: 'default', label: 'Default', class: '' },
  { id: 'hover', label: 'Hover', class: 'amber-is-hover' },
  { id: 'focus', label: 'Focus', class: 'amber-is-focus' },
  { id: 'pressed', label: 'Pressed', class: 'amber-is-pressed' },
  { id: 'disabled', label: 'Disabled', class: '' },
  { id: 'loading', label: 'Loading', class: '' },
] as const
const iconStates = states.filter((state) => state.id !== 'loading')
const surfaces = [
  { surface: 'canvas', fill: 'raised' },
  { surface: 'base', fill: 'raised' },
  { surface: 'card', fill: 'raised' },
  { surface: 'raised', fill: 'border' },
] as const
</script>

<template>
  <h2 class="section-heading">Buttons</h2>
  <template v-for="size in sizes" :key="size.id">
    <section v-for="setup in setups" :key="setup.id" class="button-section">
      <h3 class="table-heading">{{ size.label }}, {{ setup.label.toLowerCase() }}</h3>
      <table class="state-table">
        <thead>
          <tr>
            <td></td>
            <th v-for="state in states" :key="state.id" scope="col">{{ state.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="variant in variants" :key="variant">
            <th scope="row">{{ variant }}</th>
            <td v-for="state in states" :key="state.id">
              <AmberButton
                :variant="variant"
                :size="size.id"
                :class="state.class"
                :disabled="state.id === 'disabled'"
                :loading="state.id === 'loading'"
                :leading-icon="setup.id === 'leading' ? Plus : undefined"
                :trailing-icon="setup.id === 'trailing' ? ArrowRight : undefined"
              >
                Button
              </AmberButton>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>

  <h2 class="section-heading">As link</h2>
  <div class="button-row">
    <AmberButton variant="primary" href="#link">Primary link</AmberButton>
    <AmberButton href="#link">Secondary link</AmberButton>
    <AmberButton href="#link" disabled>Disabled link</AmberButton>
  </div>

  <h2 class="section-heading">Icon button</h2>
  <table class="state-table">
    <thead>
      <tr>
        <td></td>
        <th v-for="state in iconStates" :key="state.id" scope="col">{{ state.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="dot in [false, true]" :key="String(dot)">
        <th scope="row">{{ dot ? 'With dot' : 'Without dot' }}</th>
        <td v-for="state in iconStates" :key="state.id">
          <AmberIconButton
            :icon="Bell"
            aria-label="Notifications"
            :dot="dot"
            :class="state.class"
            :disabled="state.id === 'disabled'"
          />
        </td>
      </tr>
    </tbody>
  </table>

  <h2 class="section-heading">Secondary on each surface</h2>
  <div class="surface-row">
    <figure
      v-for="item in surfaces"
      :key="item.surface"
      class="surface-panel"
      :class="`is-${item.surface}`"
    >
      <AmberButton :surface="item.surface">Secondary</AmberButton>
      <figcaption class="token-usage">On {{ item.surface }}: {{ item.fill }} fill</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.section-heading {
  margin: var(--amber-space-8) 0 var(--amber-space-4);
  font-size: var(--amber-type-subheading-size);
  font-weight: var(--amber-type-subheading-weight);
  line-height: var(--amber-type-subheading-line-height);
}

.section-heading:first-child {
  margin-top: 0;
}

.table-heading {
  margin: var(--amber-space-4) 0 var(--amber-space-2);
  color: var(--amber-text-secondary);
  font-size: var(--amber-type-caption-size);
  font-weight: var(--amber-type-caption-weight);
  line-height: var(--amber-type-caption-line-height);
}

.state-table {
  border-collapse: collapse;
}

.state-table th,
.state-table td {
  padding: var(--amber-space-2) var(--amber-space-4) var(--amber-space-2) 0;
  color: var(--amber-text-muted);
  font-size: var(--amber-type-caption-size);
  font-weight: var(--amber-type-caption-weight);
  line-height: var(--amber-type-caption-line-height);
  text-align: left;
}

.state-table tbody th {
  text-transform: capitalize;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--amber-space-4);
}

.surface-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--amber-space-4);
}

.surface-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--amber-space-4);
  margin: 0;
  padding: var(--amber-space-6);
  border-radius: var(--amber-radius-lg);
}

.surface-panel.is-canvas {
  background: var(--amber-canvas);
}

.surface-panel.is-base {
  background: var(--amber-base);
}

.surface-panel.is-card {
  background: var(--amber-card);
}

.surface-panel.is-raised {
  background: var(--amber-raised);
}
</style>
