<script setup lang="ts">
defineProps<{ notes: string[] }>()
</script>

<template>
  <aside class="usage-note">
    <h2 class="usage-note-title">Usage</h2>
    <p v-for="note in notes" :key="note" class="usage-note-text">{{ note }}</p>
  </aside>
</template>

<style scoped>
.usage-note {
  margin-bottom: var(--amber-space-8);
  padding: var(--amber-space-4) var(--amber-space-6);
  border-radius: var(--amber-radius-lg);
  background: var(--amber-card);
  color: var(--amber-text-secondary);
}

.usage-note-title {
  margin: 0 0 var(--amber-space-2);
  color: var(--amber-text-muted);
  font-size: var(--amber-type-overline-size);
  font-weight: var(--amber-type-overline-weight);
  line-height: var(--amber-type-overline-line-height);
  text-transform: uppercase;
}

.usage-note-text {
  margin: 0;
}

.usage-note-text + .usage-note-text {
  margin-top: var(--amber-space-2);
}
</style>
