<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="480"
    aria-labelledby="delete-api-key-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="delete-api-key-title" tag="h2">Delete API key</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <p>
          Delete <strong>{{ description }}</strong
          ><template v-if="created">, created {{ created }}</template>? This cannot be undone, and
          anything using this key will stop working immediately.
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
import type { ApiKeySummary } from '../../services/apiKeyService'
import { formatApiKeyDate, formatApiKeyDescription } from '../../utils/formatApiKey'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    apiKey?: ApiKeySummary | null
    deleting?: boolean
    error?: string | null
  }>(),
  { apiKey: null, deleting: false, error: null },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  confirm: []
}>()

const { xs } = useDisplay()

const description = computed(() => formatApiKeyDescription(props.apiKey?.description ?? ''))
const created = computed(() => (props.apiKey ? formatApiKeyDate(props.apiKey.createdAt) : ''))

function close(): void {
  emit('update:modelValue', false)
}
</script>
