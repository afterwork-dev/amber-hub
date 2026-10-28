<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    aria-labelledby="new-api-key-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="new-api-key-title" tag="h2">New API key</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <v-form ref="form" validate-on="submit">
          <v-text-field v-model="description" label="Description" :rules="descriptionRules" />
          <v-select
            v-model="validityDays"
            label="Validity"
            :items="VALIDITY_OPTIONS"
            item-title="title"
            item-value="value"
            :rules="validityRules"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancel" @click="close" />
        <v-btn
          text="Create"
          variant="flat"
          color="primary"
          :disabled="saving"
          :loading="saving"
          @click="submit"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import type { VForm } from 'vuetify/components/VForm'
import type { CreateApiKeyInput, ValidityDays } from '../../services/apiKeyService'

const MAX_DESCRIPTION_LENGTH = 200

const VALIDITY_OPTIONS = [
  { title: '30 days', value: 30 },
  { title: '60 days', value: 60 },
  { title: '90 days', value: 90 },
] as const

const props = withDefaults(
  defineProps<{ modelValue: boolean; error?: string | null; saving?: boolean }>(),
  { error: null, saving: false },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  create: [input: CreateApiKeyInput]
}>()

type Rule = (value: unknown) => true | string

const descriptionRules: Rule[] = [
  (value) =>
    String(value ?? '').trim().length <= MAX_DESCRIPTION_LENGTH ||
    `Keep the description to ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
]

const validityRules: Rule[] = [(value) => Boolean(value) || 'A validity is required.']

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const form = ref<VForm | null>(null)
const description = ref('')
const validityDays = ref<ValidityDays>(30)

watch(
  () => props.modelValue,
  (open) => {
    if (open) return

    description.value = ''
    validityDays.value = 30
    form.value?.resetValidation()
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function submit(): Promise<void> {
  const result = await form.value?.validate()
  if (!result?.valid) return

  const input: CreateApiKeyInput = { validityDays: validityDays.value }

  if (description.value.trim() !== '') input.description = description.value.trim()

  emit('create', input)
}
</script>
