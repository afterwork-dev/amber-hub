<script setup lang="ts">
import DerivedTag from '../components/DerivedTag.vue'
import UsageNote from '../components/UsageNote.vue'
import { typography } from '../foundations'
</script>

<template>
  <UsageNote :notes="typography.notes" />
  <ul class="type-rows">
    <li v-for="style in typography.styles" :key="style.name" class="type-row">
      <p
        class="type-sample"
        :style="{
          fontSize: `var(--amber-type-${style.name}-size)`,
          fontWeight: `var(--amber-type-${style.name}-weight)`,
          lineHeight: `var(--amber-type-${style.name}-line-height)`,
          textTransform: style.uppercase ? 'uppercase' : undefined,
          letterSpacing: style.letterSpacing,
        }"
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <div class="type-meta">
        <div class="token-name">{{ style.name }}</div>
        <ul class="type-specs">
          <li v-for="spec in style.specs" :key="spec.label" class="token-value">
            {{ spec.label }} {{ spec.value }}
            <DerivedTag v-if="spec.derived" />
          </li>
        </ul>
        <div class="token-usage">{{ style.usage }}</div>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.type-rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.type-row {
  padding: var(--amber-space-6) 0;
  border-bottom: 1px solid var(--amber-raised);
}

.type-sample {
  margin: 0 0 var(--amber-space-2);
  overflow-wrap: anywhere;
}

.type-specs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--amber-space-1) var(--amber-space-4);
  margin: var(--amber-space-1) 0;
  padding: 0;
  list-style: none;
}
</style>
