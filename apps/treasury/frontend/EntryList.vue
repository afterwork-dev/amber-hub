<template>
  <div class="treasury-entries py-4">
    <div v-if="loading" class="treasury-entries-state" aria-live="polite">
      <v-progress-circular indeterminate color="primary" aria-label="Loading your entries" />
      <p class="mt-4">Loading your entries…</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
      <p>{{ error }}</p>
      <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry')" />
    </v-alert>

    <template v-else>
      <v-btn-toggle
        v-model="activeCategory"
        class="treasury-filter mb-4"
        role="group"
        aria-label="Filter entries by category"
        color="primary"
        mandatory
        density="comfortable"
      >
        <v-btn
          value="all"
          :height="FILTER_BUTTON_HEIGHT"
          :aria-pressed="activeCategory === 'all'"
          text="All"
        />
        <v-btn
          v-for="category in ENTRY_CATEGORIES"
          :key="category.id"
          :value="category.id"
          :height="FILTER_BUTTON_HEIGHT"
          :aria-pressed="activeCategory === category.id"
          :text="category.name"
        />
      </v-btn-toggle>

      <v-data-table
        class="treasury-table"
        :headers="headers"
        :items="visibleEntries"
        :items-per-page="-1"
        :mobile="false"
        item-value="id"
        striped="odd"
        hide-default-footer
      >
        <template #[`item.name`]="{ item }">
          <span
            v-if="formatEntryCategoryEmoji(item.categoryId)"
            class="treasury-entry-emoji"
            role="img"
            :aria-label="formatEntryCategory(item.categoryId)"
            >{{ formatEntryCategoryEmoji(item.categoryId) }}</span
          >{{ item.name }}
        </template>

        <template #no-data />
      </v-data-table>

      <div v-if="entries.length === 0" class="treasury-entries-state">
        <h2 class="text-h6">No entries yet</h2>
        <p class="text-medium-emphasis mt-2">
          Select “New” to record the first piece of your treasury.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ENTRY_CATEGORIES } from '../shared/entry-categories'
import type { TreasuryEntry } from '../shared/types'
import {
  formatEntryCategory,
  formatEntryCategoryEmoji,
  formatEur,
  formatLocation,
  formatPurchaseDate,
} from './formatEntry'

const props = defineProps<{
  entries: TreasuryEntry[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: [] }>()

const FILTER_BUTTON_HEIGHT = 40

const activeCategory = ref('all')

const visibleEntries = computed(() =>
  activeCategory.value === 'all'
    ? props.entries
    : props.entries.filter((entry) => entry.categoryId === activeCategory.value),
)

const headers = [
  { title: 'Name', key: 'name', sortable: false },
  {
    title: 'Serial No',
    key: 'serialNo',
    value: (entry: TreasuryEntry) => entry.serialNo ?? '',
    sortable: false,
  },
  {
    title: 'Purchase Date',
    key: 'purchaseDate',
    value: (entry: TreasuryEntry) => formatPurchaseDate(entry.purchaseDate),
    sortable: false,
  },
  {
    title: 'Purchase Value',
    key: 'purchaseValue',
    value: (entry: TreasuryEntry) => formatEur(entry.purchaseValueCents),
    sortable: false,
  },
  {
    title: 'Location',
    key: 'location',
    value: (entry: TreasuryEntry) => formatLocation(entry.locationId),
    sortable: false,
  },
]
</script>
