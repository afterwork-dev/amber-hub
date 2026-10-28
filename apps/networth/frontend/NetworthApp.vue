<template>
  <v-layout class="networth-shell" :style="{ height: `${height}px` }">
    <v-app-bar absolute flat class="networth-header">
      <v-app-bar-title>
        <h1 class="networth-title">Net Worth</h1>
      </v-app-bar-title>

      <template #append>
        <v-btn text="New" variant="flat" color="primary" @click="openMonth(null)" />
      </template>
    </v-app-bar>

    <v-main class="networth-content">
      <networth-dashboard
        :entries="entries"
        :loading="loading"
        :error="loadError"
        @retry="loadEntries"
        @select="openMonth"
      />
    </v-main>

    <month-dialog
      v-model="dialogOpen"
      :month="editedMonth"
      :entries="entries"
      :error="saveError"
      :saving="saving"
      @save="onSave"
      @delete="askDelete"
    />

    <confirm-dialog
      :model-value="pendingDelete !== null"
      :title="`Delete ${pendingDelete ? formatMonth(pendingDelete) : ''}?`"
      :message="deleteMessage"
      confirm-text="Delete"
      :busy="deleting"
      :error="deleteError"
      @update:model-value="pendingDelete = null"
      @confirm="onDelete"
    />

    <v-snackbar v-model="confirmationVisible" timeout="4000" role="status" aria-live="polite">
      {{ confirmation }}
    </v-snackbar>
  </v-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { MonthEntryInput } from '../shared/types'
import ConfirmDialog from './ConfirmDialog.vue'
import MonthDialog from './MonthDialog.vue'
import NetworthDashboard from './NetworthDashboard.vue'
import { formatMonth } from './monthLabel'
import { entriesOf } from './monthSummary'
import { useAvailableHeight } from './useAvailableHeight'
import { useDeleteMonth } from './useDeleteMonth'
import { useEntryList } from './useEntryList'
import { useSaveMonth } from './useSaveMonth'

const props = defineProps<{ host: Element }>()

const { height, stop } = useAvailableHeight(props.host)
const {
  entries,
  loading,
  error: loadError,
  loadEntries,
  replaceMonth,
  removeMonth,
} = useEntryList()
const { saving, error: saveError, saveMonth } = useSaveMonth()
const { deleting, error: deleteError, deleteMonth } = useDeleteMonth()

const dialogOpen = ref(false)
const editedMonth = ref<string | null>(null)
const pendingDelete = ref<string | null>(null)
const confirmationVisible = ref(false)
const confirmation = ref('')

const deleteMessage = computed(() => {
  if (!pendingDelete.value) return ''

  const count = entriesOf(entries.value, pendingDelete.value).length
  const noun = count === 1 ? 'entry' : 'entries'
  return `All ${count} ${noun} of this month will be deleted. This cannot be undone.`
})

function confirm(message: string): void {
  confirmation.value = message
  confirmationVisible.value = true
}

function openMonth(month: string | null): void {
  saveError.value = null
  editedMonth.value = month
  dialogOpen.value = true
}

async function onSave(month: string, monthEntries: MonthEntryInput[]): Promise<void> {
  const stored = await saveMonth(month, monthEntries)
  if (!stored) return

  replaceMonth(month, stored)
  dialogOpen.value = false
  confirm('Month saved')
}

function askDelete(month: string): void {
  deleteError.value = null
  pendingDelete.value = month
}

async function onDelete(): Promise<void> {
  const month = pendingDelete.value
  if (!month || !(await deleteMonth(month))) return

  removeMonth(month)
  pendingDelete.value = null
  dialogOpen.value = false
  confirm('Month deleted')
}

onMounted(loadEntries)
onUnmounted(stop)
</script>
