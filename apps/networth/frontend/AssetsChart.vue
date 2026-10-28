<template>
  <dashboard-card title="Assets" :subtitle="formatMonth(month)">
    <p v-if="totals.length === 0" class="networth-dashboard-state text-medium-emphasis">
      No assets recorded for this month.
    </p>

    <template v-else>
      <div class="networth-chart networth-doughnut">
        <doughnut-chart :data="chart.data" :options="chart.options" :aria-label="description" />
        <div class="networth-doughnut-total" aria-hidden="true">
          <p class="text-h5 font-weight-bold">{{ formatEurCompact(totalCents) }}</p>
          <p class="text-caption text-medium-emphasis">Total assets</p>
        </div>
      </div>

      <ul class="networth-legend mt-4">
        <li v-for="total in totals" :key="total.category" class="text-body-2">
          <span
            class="networth-legend-swatch"
            :style="{ backgroundColor: CATEGORY_COLORS[total.category] }"
          />
          {{ total.title }}
          <span class="text-medium-emphasis">{{ share(total) }}</span>
        </li>
      </ul>
    </template>
  </dashboard-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut as DoughnutChart } from 'vue-chartjs'
import DashboardCard from './DashboardCard.vue'
import { assetsChart } from './chartData'
import './chartSetup'
import { CATEGORY_COLORS } from './chartTheme'
import { formatEur, formatEurCompact } from './formatEur'
import { formatMonth } from './monthLabel'
import type { CategoryTotal } from './monthSummary'

const PERCENT = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

const props = defineProps<{ month: string; totals: CategoryTotal[] }>()

const chart = computed(() => assetsChart(props.totals))
const totalCents = computed(() => props.totals.reduce((sum, total) => sum + total.valueCents, 0))

function share(total: CategoryTotal): string {
  return PERCENT.format(total.valueCents / totalCents.value)
}

const description = computed(
  () =>
    `Total assets ${formatEur(totalCents.value)}: ` +
    props.totals
      .map((total) => `${total.title} ${formatEur(total.valueCents)} (${share(total)})`)
      .join(', '),
)
</script>
