<template>
  <div class="networth-dashboard py-4">
    <div v-if="loading" class="networth-dashboard-state" aria-live="polite">
      <v-progress-circular indeterminate color="primary" aria-label="Loading your net worth" />
      <p class="mt-4">Loading your net worth…</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
      <p>{{ error }}</p>
      <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry')" />
    </v-alert>

    <div v-else-if="!latest" class="networth-dashboard-state">
      <h2 class="text-h6">No months recorded yet</h2>
      <p class="text-medium-emphasis mt-2">Select “New” to record your first month.</p>
    </div>

    <v-row v-else>
      <v-col cols="12" md="6">
        <summary-chart :summary="latest" />
      </v-col>
      <v-col cols="12" md="6">
        <assets-chart :month="latest.month" :totals="latestCategories" />
      </v-col>
      <v-col cols="12">
        <networth-trend-chart :summaries="summaries" />
      </v-col>
      <v-col cols="12">
        <months-table :summaries="summaries" @select="emit('select', $event)" />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NetworthEntry } from '../shared/types'
import AssetsChart from './AssetsChart.vue'
import MonthsTable from './MonthsTable.vue'
import NetworthTrendChart from './NetworthTrendChart.vue'
import SummaryChart from './SummaryChart.vue'
import { categoryTotals, entriesOf, summarizeMonths } from './monthSummary'

const props = defineProps<{
  entries: NetworthEntry[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: []; select: [month: string] }>()

const summaries = computed(() => summarizeMonths(props.entries))
const latest = computed(() => summaries.value[0])
const latestCategories = computed(() =>
  latest.value ? categoryTotals(entriesOf(props.entries, latest.value.month)) : [],
)
</script>
