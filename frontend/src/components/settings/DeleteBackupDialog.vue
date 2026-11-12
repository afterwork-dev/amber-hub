<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="480"
    aria-labelledby="delete-backup-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="delete-backup-title" tag="h2">Delete backup</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <p>
          Delete the backup created <strong>{{ created }}</strong>? This cannot be undone.
        </p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancel" @click="close" />
        <v-btn
          text="Delete"
          variant="flat"
          color="error"
          :disabled="deleting"
          :loading="deleting"
          @click="emit('confirm')"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import type { BackupSummary } from '../../services/backupService'
import { formatApiKeyDate } from '../../utils/formatApiKey'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    backup?: BackupSummary | null
    deleting?: boolean
    error?: string | null
  }>(),
  { backup: null, deleting: false, error: null },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  confirm: []
}>()

const { xs } = useDisplay()

const created = computed(() => (props.backup ? formatApiKeyDate(props.backup.createdAt) : ''))

function close(): void {
  emit('update:modelValue', false)
}
</script>
