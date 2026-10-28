<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    aria-labelledby="investment-income-new-asset-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="investment-income-new-asset-title" tag="h2">New asset</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <v-form ref="form" validate-on="submit">
          <v-text-field v-model="name" label="Name" :rules="nameRules" />
          <v-text-field v-model="bookingName" label="Booking name" :rules="bookingNameRules" />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancel" @click="close" />
        <v-btn
          text="Save"
          variant="flat"
          color="primary"
          :disabled="saving"
          :loading="saving"
          @click="save"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import type { VForm } from 'vuetify/components/VForm'
import { MAX_BOOKING_NAME_LENGTH, MAX_NAME_LENGTH } from '../shared/entry-limits'
import type { NewAssetInput } from '../shared/types'
import { optionalText, requiredText, type Rule } from './fieldRules'

const props = withDefaults(
  defineProps<{ modelValue: boolean; error?: string | null; saving?: boolean }>(),
  { error: null, saving: false },
)

const nameRules: Rule[] = requiredText('name', MAX_NAME_LENGTH)
const bookingNameRules: Rule[] = optionalText('booking name', MAX_BOOKING_NAME_LENGTH)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  save: [asset: NewAssetInput]
}>()

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const form = ref<VForm | null>(null)
const name = ref('')
const bookingName = ref('')

// The dialog outlives its content, so clear it on close or a reopen still holds the last input.
watch(
  () => props.modelValue,
  (open) => {
    if (open) return

    name.value = ''
    bookingName.value = ''
    form.value?.resetValidation()
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function save(): Promise<void> {
  const result = await form.value?.validate()
  if (!result?.valid) return

  const asset: NewAssetInput = { name: name.value.trim() }
  if (bookingName.value.trim() !== '') asset.bookingName = bookingName.value.trim()

  emit('save', asset)
}
</script>
