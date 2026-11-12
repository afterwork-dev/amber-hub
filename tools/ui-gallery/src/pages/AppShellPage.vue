<script setup lang="ts">
import { AmberCard } from '@amber-hub/ui'
import DemoShell from '../components/DemoShell.vue'
</script>

<template>
  <DemoShell>
    <AmberCard class="demo-span-full">
      <template #title>12 columns</template>
      Spans the whole content area.
    </AmberCard>
    <AmberCard v-for="n in 2" :key="`half-${n}`" class="demo-span-half">
      <template #title>6 columns</template>
      Two of these share a row.
    </AmberCard>
    <AmberCard v-for="n in 3" :key="`third-${n}`" class="demo-span-third">
      <template #title>4 columns</template>
      Three of these share a row.
    </AmberCard>
  </DemoShell>
</template>
