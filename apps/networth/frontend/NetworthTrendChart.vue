<template>
  <dashboard-card title="Net worth over time">
    <div class="networth-chart networth-chart-wide">
      <line-chart :data="chart.data" :options="chart.options" :aria-label="description" />
    </div>
  </dashboard-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line as LineChart } from 'vue-chartjs'
import DashboardCard from './DashboardCard.vue'
import { trendChart } from './chartData'
import './chartSetup'
import { formatEur } from './formatEur'
import { formatMonth } from './monthLabel'
import type { MonthSummary } from './monthSummary'

const props = defineProps<{ summaries: MonthSummary[] }>()

const chart = computed(() => trendChart(props.summaries))

const description = computed(() => {
  const latest = props.summaries[0]
  const earliest = props.summaries.at(-1)
  if (!latest || !earliest) return 'Net worth over time'

  return (
    `Net worth from ${formatMonth(earliest.month)} (${formatEur(earliest.networthCents)}) ` +
    `to ${formatMonth(latest.month)} (${formatEur(latest.networthCents)})`
  )
})
</script>
