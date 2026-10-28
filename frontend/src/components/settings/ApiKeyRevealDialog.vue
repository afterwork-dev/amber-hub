<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    persistent
    aria-labelledby="api-key-reveal-title"
  >
    <v-card>
      <v-card-title id="api-key-reveal-title" tag="h2">Your new API key</v-card-title>

      <v-card-text>
        <p class="mb-4">
          Copy this key now. For your security it cannot be shown again once you close this
          dialog.
        </p>

        <v-text-field :model-value="apiKey" label="API key" readonly />

        <v-btn
          :text="copied ? 'Copied' : 'Copy'"
          :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          variant="tonal"
          aria-label="Copy API key"
          @click="copy"
        />

        <p v-if="copyFailed" role="alert" class="mt-2">
          Copying failed. Select the key above and copy it manually.
        </p>

        <span role="status" aria-live="polite" class="d-sr-only">
          {{ copied ? 'API key copied to clipboard' : '' }}
        </span>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Done" variant="flat" color="primary" @click="done" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'

const props = defineProps<{ modelValue: boolean; apiKey: string }>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
}>()

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const copied = ref(false)
const copyFailed = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    copied.value = false
    copyFailed.value = false
  },
)

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.apiKey)
    copied.value = true
    copyFailed.value = false
  } catch {
    copyFailed.value = true
  }
}

function done(): void {
  emit('update:modelValue', false)
}
</script>
