<script setup lang="ts">
import UsageNote from '../components/UsageNote.vue'
import { focus } from '../foundations'
</script>

<template>
  <UsageNote :notes="focus.notes" />
  <div class="focus-samples">
    <figure class="focus-figure">
      <button type="button" class="focus-sample">Tab to me</button>
      <figcaption class="token-usage">Focusable sample</figcaption>
    </figure>
    <figure class="focus-figure">
      <span class="focus-sample is-focused" aria-hidden="true">Tab to me</span>
      <figcaption class="token-usage">Static copy, always drawn focused</figcaption>
    </figure>
  </div>
  <div class="token-name">--amber-{{ focus.ring.token }}</div>
  <div class="token-value">{{ focus.ring.value }}</div>
</template>

<style scoped>
.focus-samples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--amber-space-8);
  margin-bottom: var(--amber-space-6);
}

.focus-figure {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--amber-space-2);
  margin: 0;
}

.focus-sample {
  display: inline-block;
  padding: var(--amber-space-2) var(--amber-space-6);
  border: 1px solid var(--amber-border);
  border-radius: var(--amber-radius-full);
  background: var(--amber-card);
  color: var(--amber-text-primary);
  font-weight: 600;
  outline: none;
}

.focus-sample:focus-visible,
.focus-sample.is-focused {
  outline: 1px solid var(--amber-accent-500);
  box-shadow: var(--amber-focus-ring);
}
</style>
