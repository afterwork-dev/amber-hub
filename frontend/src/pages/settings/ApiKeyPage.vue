<template>
  <v-toolbar flat>
    <v-toolbar-title tag="h2">API Keys</v-toolbar-title>

    <template #append>
      <v-btn text="New" variant="flat" color="primary" @click="openDialog" />
    </template>
  </v-toolbar>

  <api-key-list
    :api-keys="apiKeys"
    :loading="listLoading"
    :error="listError"
    @retry="loadList"
    @delete="onDeleteRequest"
  />

  <new-api-key-dialog
    v-model="dialogOpen"
    :error="createError"
    :saving="saving"
    @create="onCreate"
  />

  <delete-api-key-dialog
    v-model="deleteDialogOpen"
    :api-key="keyToDelete"
    :deleting="deleting"
    :error="deleteError"
    @confirm="onConfirmDelete"
  />

  <api-key-reveal-dialog v-model="revealOpen" :api-key="createdKey ?? ''" />

  <v-snackbar v-model="confirmationVisible" timeout="4000" role="status" aria-live="polite">
    API key created
  </v-snackbar>

  <v-snackbar v-model="deletedVisible" timeout="4000" role="status" aria-live="polite">
    API key deleted
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ApiKeyList from '../../components/settings/ApiKeyList.vue'
import ApiKeyRevealDialog from '../../components/settings/ApiKeyRevealDialog.vue'
import DeleteApiKeyDialog from '../../components/settings/DeleteApiKeyDialog.vue'
import NewApiKeyDialog from '../../components/settings/NewApiKeyDialog.vue'
import { useApiKeyList } from '../../composables/useApiKeyList'
import { useCreateApiKey } from '../../composables/useCreateApiKey'
import { useDeleteApiKey } from '../../composables/useDeleteApiKey'
import type { ApiKeySummary, CreateApiKeyInput } from '../../services/apiKeyService'

const { saving, error: createError, create } = useCreateApiKey()
const {
  apiKeys,
  loading: listLoading,
  error: listError,
  load: loadList,
  add: addToList,
  remove: removeFromList,
} = useApiKeyList()
const { deleting, error: deleteError, remove: deleteKey } = useDeleteApiKey()

const dialogOpen = ref(false)
const confirmationVisible = ref(false)

const deleteDialogOpen = ref(false)
const deletedVisible = ref(false)
const keyToDelete = ref<ApiKeySummary | null>(null)

// The only place the plaintext key ever lives; closing the reveal dialog destroys it.
const createdKey = ref<string | null>(null)

const revealOpen = computed({
  get: () => createdKey.value !== null,
  set: (open: boolean) => {
    if (!open) createdKey.value = null
  },
})

onMounted(loadList)

function openDialog(): void {
  createError.value = null
  dialogOpen.value = true
}

async function onCreate(input: CreateApiKeyInput): Promise<void> {
  const created = await create(input)
  if (!created) return

  addToList(created)
  dialogOpen.value = false
  createdKey.value = created.key
  confirmationVisible.value = true
}

function onDeleteRequest(apiKey: ApiKeySummary): void {
  keyToDelete.value = apiKey
  deleteError.value = null
  deleteDialogOpen.value = true
}

async function onConfirmDelete(): Promise<void> {
  const target = keyToDelete.value
  if (!target) return

  const removed = await deleteKey(target.id)
  if (!removed) return

  removeFromList(target.id)
  deleteDialogOpen.value = false
  keyToDelete.value = null
  deletedVisible.value = true
}
</script>
