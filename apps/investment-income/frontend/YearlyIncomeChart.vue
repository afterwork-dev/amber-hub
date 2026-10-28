<template>
  <section class="investment-income-yearly mt-6" aria-labelledby="yearly-income-title">
    <h2 id="yearly-income-title" class="text-subtitle-1 mb-2">Income per year</h2>
    <div class="investment-income-chart">
      <bar-chart :data="chart.data" :options="chart.options" :aria-label="description" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar as BarChart } from 'vue-chartjs'
import type { YearlyIncome } from './assetIncome'
import './chartSetup'
import { formatEur } from './formatEntry'
import { yearlyIncomeChart } from './chartData'

const props = defineProps<{ years: YearlyIncome[] }>()

const chart = computed(() => yearlyIncomeChart(props.years))

/** A canvas says nothing to a screen reader, so the label carries every bar's value. */
const description = computed(
  () =>
    'Income per year: ' +
    props.years.map((row) => `${row.year} ${formatEur(row.totalCents)}`).join(', '),
)
</script>
