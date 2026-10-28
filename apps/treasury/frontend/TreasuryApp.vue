<template>
  <v-layout class="treasury-shell" :style="{ height: `${height}px` }">
    <v-app-bar absolute flat class="treasury-header">
      <v-app-bar-title>
        <h1 class="treasury-title">Treasury</h1>
      </v-app-bar-title>

      <template #append>
        <v-btn text="New" variant="flat" color="primary" @click="openDialog" />
      </template>
    </v-app-bar>

    <v-main class="treasury-content">
      <entry-list
        :entries="entries"
        :loading="loading"
        :error="loadError"
        @retry="loadEntries"
      />
    </v-main>

    <new-entry-dialog v-model="dialogOpen" :error="saveError" :saving="saving" @save="onSave" />

    <v-snackbar v-model="confirmationVisible" timeout="4000" role="status" aria-live="polite">
      Entry saved
    </v-snackbar>
  </v-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { NewEntryInput } from '../shared/types'
import EntryList from './EntryList.vue'
import NewEntryDialog from './NewEntryDialog.vue'
import { useAvailableHeight } from './useAvailableHeight'
import { useEntryList } from './useEntryList'
import { useSaveEntry } from './useSaveEntry'

const props = defineProps<{ host: Element }>()

const { height, stop } = useAvailableHeight(props.host)
const { entries, loading, error: loadError, loadEntries, addEntry } = useEntryList()
const { saving, error: saveError, saveEntry } = useSaveEntry()

const dialogOpen = ref(false)
const confirmationVisible = ref(false)

function openDialog(): void {
  saveError.value = null
  dialogOpen.value = true
}

async function onSave(entry: NewEntryInput): Promise<void> {
  const stored = await saveEntry(entry)
  if (!stored) return

  addEntry(stored)
  dialogOpen.value = false
  confirmationVisible.value = true
}

onMounted(loadEntries)
onUnmounted(stop)
</script>
