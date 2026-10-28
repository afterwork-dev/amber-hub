<template>
  <dashboard-card title="All months">
    <v-data-table
      class="networth-table"
      :headers="headers"
      :items="summaries"
      :items-per-page="-1"
      :mobile="false"
      item-value="month"
      striped="odd"
      hide-default-footer
    >
      <template #[`item.month`]="{ item }">
        <v-btn
          :text="formatMonth(item.month)"
          variant="text"
          class="text-none px-0"
          :aria-label="`Edit ${formatMonth(item.month)}`"
          @click="emit('select', item.month)"
        />
      </template>

      <template #no-data />
    </v-data-table>
  </dashboard-card>
</template>

<script setup lang="ts">
import DashboardCard from './DashboardCard.vue'
import { formatEur } from './formatEur'
import { formatMonth } from './monthLabel'
import type { MonthSummary } from './monthSummary'

defineProps<{ summaries: MonthSummary[] }>()

const emit = defineEmits<{ select: [month: string] }>()

const headers = [
  { title: 'Month', key: 'month', sortable: false },
  {
    title: 'Assets',
    key: 'assetsCents',
    value: (summary: MonthSummary) => formatEur(summary.assetsCents),
    align: 'end' as const,
    sortable: false,
  },
  {
    title: 'Liabilities',
    key: 'liabilitiesCents',
    value: (summary: MonthSummary) => formatEur(summary.liabilitiesCents),
    align: 'end' as const,
    sortable: false,
  },
  {
    title: 'Net worth',
    key: 'networthCents',
    value: (summary: MonthSummary) => formatEur(summary.networthCents),
    align: 'end' as const,
    sortable: false,
  },
]
</script>
