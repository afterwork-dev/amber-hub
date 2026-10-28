<template>
  <dashboard-card title="Summary" :subtitle="formatMonth(summary.month)">
    <div class="networth-chart">
      <bar-chart :data="chart.data" :options="chart.options" :aria-label="description" />
    </div>
  </dashboard-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar as BarChart } from 'vue-chartjs'
import DashboardCard from './DashboardCard.vue'
import { summaryChart } from './chartData'
import './chartSetup'
import { formatEur } from './formatEur'
import { formatMonth } from './monthLabel'
import type { MonthSummary } from './monthSummary'

const props = defineProps<{ summary: MonthSummary }>()

const chart = computed(() => summaryChart(props.summary))

const description = computed(
  () =>
    `Net worth ${formatEur(props.summary.networthCents)}, ` +
    `assets ${formatEur(props.summary.assetsCents)}, ` +
    `liabilities ${formatEur(props.summary.liabilitiesCents)}`,
)
</script>
