<script setup lang="ts">
import { ref } from 'vue'
import {
  AmberBadge,
  AmberButton,
  AmberCard,
  AmberEmptyState,
  AmberSkeleton,
  AmberSpinner,
  AmberStatusMessage,
} from '@amber-hub/ui'
import { Inbox, SearchX } from '@amber-hub/ui/icons'

const statuses = ['success', 'warning', 'error', 'info'] as const
const spinnerSizes = [16, 20, 32] as const
const surfaces = ['canvas', 'base', 'card', 'raised'] as const

const dismissed = ref<string[]>([])
function dismiss(id: string) {
  dismissed.value = [...dismissed.value, id]
}
function reset() {
  dismissed.value = []
}
</script>

<template>
  <h2 class="section-heading">Card</h2>
  <div class="card-row">
    <AmberCard class="sample-card">
      <template #title>Team workspace</template>
      <AmberBadge>Active plan</AmberBadge>
      <p class="sample-text">Share projects and budgets with the people you work with.</p>
      <template #actions><AmberButton variant="primary">Open workspace</AmberButton></template>
    </AmberCard>
    <AmberCard panel class="sample-card">
      <template #title>Team workspace</template>
      <AmberBadge>Active plan</AmberBadge>
      <p class="sample-text">Share projects and budgets with the people you work with.</p>
      <template #actions><AmberButton variant="primary">Open workspace</AmberButton></template>
    </AmberCard>
  </div>

  <h2 class="section-heading">Badge</h2>
  <div class="row">
    <AmberBadge>Active plan</AmberBadge>
    <AmberBadge v-for="status in statuses" :key="status" :status="status">{{ status }}</AmberBadge>
  </div>

  <h2 class="section-heading">Status message</h2>
  <div class="message-list">
    <template v-for="dismissible in [false, true]" :key="String(dismissible)">
      <template v-for="status in statuses" :key="status">
        <AmberStatusMessage
          v-if="!dismissed.includes(`${dismissible}-${status}`)"
          :variant="status"
          :dismissible="dismissible"
          @dismiss="dismiss(`${dismissible}-${status}`)"
        >
          {{ dismissible ? 'Dismissible' : 'Plain' }} {{ status }} message.
        </AmberStatusMessage>
      </template>
    </template>
  </div>
  <div class="row reset-row">
    <AmberButton @click="reset">Reset</AmberButton>
  </div>

  <h2 class="section-heading">Spinner</h2>
  <div class="row">
    <figure
      v-for="surface in surfaces"
      :key="surface"
      class="surface-panel"
      :class="`is-${surface}`"
    >
      <div class="row">
        <AmberSpinner v-for="size in spinnerSizes" :key="size" :size="size" :delay="false" />
      </div>
      <figcaption class="token-usage">On {{ surface }}</figcaption>
    </figure>
    <figure class="surface-panel is-accent">
      <div class="row">
        <AmberSpinner
          v-for="size in spinnerSizes"
          :key="size"
          :size="size"
          on-accent
          :delay="false"
        />
      </div>
      <figcaption class="on-accent-caption">On accent-500</figcaption>
    </figure>
  </div>
  <div class="row button-row">
    <AmberButton variant="primary" loading>Primary</AmberButton>
    <AmberButton variant="primary" size="sm" loading>Primary</AmberButton>
    <AmberButton loading>Secondary</AmberButton>
    <AmberButton size="sm" loading>Secondary</AmberButton>
  </div>

  <h2 class="section-heading">Empty state</h2>
  <div class="card-row">
    <AmberCard class="sample-card">
      <AmberEmptyState
        :icon="Inbox"
        title="No entries yet"
        description="Add your first entry to start tracking."
      >
        <template #action><AmberButton>Add entry</AmberButton></template>
      </AmberEmptyState>
    </AmberCard>
    <AmberCard class="sample-card">
      <AmberEmptyState
        :icon="SearchX"
        title="Nothing matches these filters"
        description="Try removing a filter or two."
      >
        <template #action><AmberButton variant="ghost">Clear filters</AmberButton></template>
      </AmberEmptyState>
    </AmberCard>
  </div>

  <h2 class="section-heading">Skeleton</h2>
  <div class="card-row">
    <AmberCard class="sample-card">
      <template #title>Team workspace</template>
      <AmberBadge>Active plan</AmberBadge>
      <p class="sample-text">Share projects and budgets with the people you work with.</p>
      <template #actions><AmberButton variant="primary">Open workspace</AmberButton></template>
    </AmberCard>
    <AmberCard class="sample-card">
      <AmberSkeleton>
        <div class="skeleton-stack">
          <div class="amber-skeleton__line" style="width: 50%" />
          <div
            class="amber-skeleton__block"
            style="width: 96px; height: 26px; border-radius: var(--amber-radius-full)"
          />
          <div class="skeleton-text">
            <div class="amber-skeleton__line" />
            <div class="amber-skeleton__line" style="width: 70%" />
          </div>
          <div
            class="amber-skeleton__block"
            style="width: 170px; height: 48px; border-radius: var(--amber-radius-full)"
          />
        </div>
      </AmberSkeleton>
    </AmberCard>
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

.row,
.card-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--amber-space-4);
}

.card-row {
  gap: var(--amber-space-6);
}

.sample-card {
  flex: 1 1 320px;
  max-width: 420px;
}

.sample-card :deep(.amber-card__body) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--amber-space-4);
}

.sample-text {
  margin: 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: var(--amber-space-2);
  max-width: 560px;
}

.reset-row,
.button-row {
  margin-top: var(--amber-space-4);
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--amber-space-4);
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--amber-space-2);
  width: 100%;
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

.surface-panel.is-accent {
  background: var(--amber-accent-500);
}

.on-accent-caption {
  color: var(--amber-on-accent);
  font-size: var(--amber-type-caption-size);
  font-weight: var(--amber-type-caption-weight);
  line-height: var(--amber-type-caption-line-height);
}
</style>
