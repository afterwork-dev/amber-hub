<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    aria-labelledby="investment-income-confirm-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="investment-income-confirm-title" tag="h2">{{ title }}</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        {{ message }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancel" :disabled="busy" @click="close" />
        <v-btn
          :text="confirmText"
          variant="flat"
          color="error"
          :disabled="busy"
          :loading="busy"
          @click="emit('confirm')"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message: string
    confirmText: string
    busy?: boolean
    error?: string | null
  }>(),
  { busy: false, error: null },
)

const emit = defineEmits<{ 'update:modelValue': [open: boolean]; confirm: [] }>()

// Only phone-width viewports need a fullscreen sheet; `mobile` would catch a laptop window too.
const { xs } = useDisplay()

function close(): void {
  emit('update:modelValue', false)
}
</script>
