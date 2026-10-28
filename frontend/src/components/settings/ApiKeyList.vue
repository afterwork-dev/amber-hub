<template>
  <div class="api-key-list py-4">
    <div v-if="loading" class="api-key-list-state" aria-live="polite">
      <v-progress-circular indeterminate color="primary" aria-label="Loading your API keys" />
      <p class="mt-4">Loading your API keys…</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
      <p>{{ error }}</p>
      <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry')" />
    </v-alert>

    <v-data-table
      v-else-if="apiKeys.length > 0"
      class="api-key-table"
      :headers="headers"
      :items="apiKeys"
      :items-per-page="-1"
      :mobile="false"
      :row-props="rowProps"
      item-value="id"
      hide-default-footer
    >
      <template #[`item.status`]="{ item }">
        <v-chip
          :color="apiKeyStatus(item.expiresAt) === 'active' ? 'success' : undefined"
          size="small"
          label
        >
          {{ apiKeyStatus(item.expiresAt) === 'active' ? 'Active' : 'Expired' }}
        </v-chip>
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          :aria-label="`Delete key ${formatApiKeyDescription(item.description)}`"
          icon="mdi-delete"
          variant="text"
          size="small"
          density="comfortable"
          @click="emit('delete', item)"
        />
      </template>
    </v-data-table>

    <div v-else class="api-key-list-state">
      <h2 class="text-h6">No API keys yet</h2>
      <p class="text-medium-emphasis mt-2">Select “New” to create your first API key.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiKeySummary } from '../../services/apiKeyService'
import { apiKeyStatus, formatApiKeyDate, formatApiKeyDescription } from '../../utils/formatApiKey'

defineProps<{
  apiKeys: ApiKeySummary[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: []; delete: [apiKey: ApiKeySummary] }>()

const headers = [
  {
    title: 'Description',
    key: 'description',
    value: (item: ApiKeySummary) => formatApiKeyDescription(item.description),
    sortable: false,
  },
  {
    title: 'Created',
    key: 'createdAt',
    value: (item: ApiKeySummary) => formatApiKeyDate(item.createdAt),
    sortable: false,
  },
  {
    title: 'Expires',
    key: 'expiresAt',
    value: (item: ApiKeySummary) => formatApiKeyDate(item.expiresAt),
    sortable: false,
  },
  { title: 'Status', key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]

function rowProps({ item }: { item: ApiKeySummary }): Record<string, unknown> {
  return apiKeyStatus(item.expiresAt) === 'expired' ? { class: 'text-medium-emphasis' } : {}
}
</script>
