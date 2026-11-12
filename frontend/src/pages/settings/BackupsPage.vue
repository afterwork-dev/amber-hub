<template>
  <v-toolbar flat>
    <v-toolbar-title tag="h2">Backups</v-toolbar-title>

    <template #append>
      <v-btn
        text="New"
        variant="flat"
        color="primary"
        :disabled="inProgress || creating"
        :loading="creating"
        @click="onCreate"
      />
    </template>
  </v-toolbar>

  <v-alert
    v-if="inProgress"
    class="mt-4"
    type="info"
    variant="tonal"
    role="status"
    aria-live="polite"
  >
    <template #prepend>
      <v-progress-circular indeterminate size="20" width="2" />
    </template>
    A backup is being created. It appears in the list when it's ready.
  </v-alert>

  <v-alert
    v-if="actionError"
    class="mt-4"
    type="error"
    variant="tonal"
    role="alert"
    closable
    @click:close="actionError = null"
  >
    {{ actionError }}
  </v-alert>

  <backup-list
    :backups="settledBackups"
    :loading="loading"
    :error="error"
    @retry="load"
    @download="download"
    @delete="onDeleteRequest"
  />

  <delete-backup-dialog
    v-model="deleteDialogOpen"
    :backup="backupToDelete"
    :deleting="deleting"
    :error="deleteError"
    @confirm="onConfirmDelete"
  />

  <v-snackbar v-model="startedVisible" timeout="4000" role="status" aria-live="polite">
    Backup started
  </v-snackbar>

  <v-snackbar v-model="deletedVisible" timeout="4000" role="status" aria-live="polite">
    Backup deleted
  </v-snackbar>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BackupList from '../../components/settings/BackupList.vue'
import DeleteBackupDialog from '../../components/settings/DeleteBackupDialog.vue'
import { useBackups } from '../../composables/useBackups'
import type { BackupSummary } from '../../services/backupService'

const {
  settledBackups,
  inProgress,
  loading,
  error,
  creating,
  actionError,
  deleting,
  deleteError,
  load,
  create,
  remove,
  download,
} = useBackups()

const startedVisible = ref(false)
const deleteDialogOpen = ref(false)
const deletedVisible = ref(false)
const backupToDelete = ref<BackupSummary | null>(null)

onMounted(load)

async function onCreate(): Promise<void> {
  if (await create()) {
    startedVisible.value = true
  }
}

function onDeleteRequest(backup: BackupSummary): void {
  backupToDelete.value = backup
  deleteError.value = null
  deleteDialogOpen.value = true
}

async function onConfirmDelete(): Promise<void> {
  const target = backupToDelete.value
  if (!target) return

  if (!(await remove(target.id))) return

  deleteDialogOpen.value = false
  backupToDelete.value = null
  deletedVisible.value = true
}
</script>
