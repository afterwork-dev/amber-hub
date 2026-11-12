<template>
  <div class="backup-list py-4">
    <div v-if="loading" class="backup-list-state" aria-live="polite">
      <v-progress-circular indeterminate color="primary" aria-label="Loading backups" />
      <p class="mt-4">Loading backups…</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
      <p>{{ error }}</p>
      <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry')" />
    </v-alert>

    <v-data-table
      v-else-if="backups.length > 0"
      class="backup-table"
      :headers="headers"
      :items="backups"
      :items-per-page="-1"
      :mobile="false"
      item-value="id"
      hide-default-footer
    >
      <template #[`item.status`]="{ item }">
        <v-chip
          :color="item.status === 'ready' ? 'success' : 'error'"
          :title="item.errorMessage ?? undefined"
          size="small"
          label
        >
          {{ item.status === 'ready' ? 'Ready' : 'Failed' }}
        </v-chip>
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          v-if="item.status === 'ready'"
          :aria-label="`Download backup from ${formatApiKeyDate(item.createdAt)}`"
          icon="mdi-download"
          variant="text"
          size="small"
          density="comfortable"
          @click="emit('download', item)"
        />
        <v-btn
          :aria-label="`Delete backup from ${formatApiKeyDate(item.createdAt)}`"
          icon="mdi-delete"
          variant="text"
          size="small"
          density="comfortable"
          @click="emit('delete', item)"
        />
      </template>
    </v-data-table>

    <div v-else class="backup-list-state">
      <h2 class="text-h6">No backups yet</h2>
      <p class="text-medium-emphasis mt-2">Select “New” to create your first backup.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BackupSummary } from '../../services/backupService'
import { formatApiKeyDate } from '../../utils/formatApiKey'
import { formatBackupSize } from '../../utils/formatBackup'

defineProps<{
  backups: BackupSummary[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  retry: []
  download: [backup: BackupSummary]
  delete: [backup: BackupSummary]
}>()

const headers = [
  {
    title: 'Created',
    key: 'createdAt',
    value: (item: BackupSummary) => formatApiKeyDate(item.createdAt),
    sortable: false,
  },
  { title: 'Created by', key: 'createdByUsername', sortable: false },
  {
    title: 'Size',
    key: 'sizeBytes',
    value: (item: BackupSummary) => formatBackupSize(item.sizeBytes),
    sortable: false,
  },
  { title: 'Status', key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
]
</script>
