<script setup lang="ts">
import { reactive } from 'vue'
import UsageNote from '../components/UsageNote.vue'
import { motion } from '../foundations'

const moved = reactive<Record<string, boolean>>({})
</script>

<template>
  <UsageNote :notes="motion.notes" />
  <ul class="motion-items">
    <li v-for="item in motion.durations" :key="item.token" class="motion-item">
      <div class="token-name">--amber-{{ item.token }}</div>
      <div class="token-value">{{ item.value }}</div>
      <div class="token-usage">{{ item.usage }}</div>
      <div class="demo">
        <button type="button" class="demo-play" @click="moved[item.token] = !moved[item.token]">
          Play
        </button>
        <div class="demo-track">
          <div
            class="demo-block"
            :class="{ 'is-moved': moved[item.token] }"
            :data-testid="`demo-${item.token}`"
            :style="{ transition: `transform var(--amber-${item.token}) var(--amber-easing)` }"
          />
        </div>
      </div>
    </li>
    <li class="motion-item">
      <div class="token-name">--amber-{{ motion.easing.token }}</div>
      <div class="token-value">{{ motion.easing.value }}</div>
      <div class="token-usage">{{ motion.easing.usage }}</div>
    </li>
  </ul>
</template>

<style scoped>
.motion-items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.motion-item {
  padding: var(--amber-space-6) 0;
  border-bottom: 1px solid var(--amber-raised);
}

.demo {
  display: flex;
  align-items: center;
  gap: var(--amber-space-4);
  margin-top: var(--amber-space-4);
}

.demo-play {
  padding: var(--amber-space-1) var(--amber-space-4);
  border: none;
  border-radius: var(--amber-radius-full);
  background: var(--amber-accent-500);
  color: var(--amber-on-accent);
  font-weight: 600;
  cursor: pointer;
}

.demo-track {
  position: relative;
  width: 240px;
  height: var(--amber-space-8);
  border-radius: var(--amber-radius-full);
  background: var(--amber-card);
}

.demo-block {
  width: var(--amber-space-8);
  height: var(--amber-space-8);
  border-radius: var(--amber-radius-full);
  background: var(--amber-accent-400);
}

.demo-block.is-moved {
  transform: translateX(208px);
}
</style>
