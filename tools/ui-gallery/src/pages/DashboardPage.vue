<script setup lang="ts">
import { AmberCard } from '@amber-hub/ui'
import DemoShell from '../components/DemoShell.vue'

const tiles = ['Balance', 'Income', 'Spending', 'Savings', 'Investments', 'Upcoming bills']
</script>

<template>
  <DemoShell>
    <AmberCard v-for="tile in tiles" :key="tile" class="demo-span-tile">
      <template #title>{{ tile }}</template>
      Placeholder content.
    </AmberCard>
  </DemoShell>
</template>
