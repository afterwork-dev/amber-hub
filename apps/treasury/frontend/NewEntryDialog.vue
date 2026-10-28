<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    aria-labelledby="treasury-new-entry-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="treasury-new-entry-title" tag="h2">New entry</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <v-form ref="form" validate-on="submit">
          <v-text-field v-model="name" label="Name" :rules="nameRules" />
          <v-text-field v-model="serialNo" label="Serial No" :rules="serialNoRules" />
          <v-text-field
            v-model="purchaseDate"
            label="Purchase date"
            placeholder="DD-MM-YYYY"
            persistent-placeholder
            :rules="purchaseDateRules"
          />
          <v-text-field
            v-model="purchaseValue"
            label="Purchase value"
            suffix="€"
            inputmode="decimal"
            :rules="purchaseValueRules"
          />
          <v-select
            v-model="locationId"
            label="Location"
            :items="LOCATIONS"
            item-title="name"
            item-value="id"
            :rules="locationRules"
          />
          <v-select
            v-model="categoryId"
            label="Category"
            :items="ENTRY_CATEGORIES"
            item-title="name"
            item-value="id"
            :rules="categoryRules"
          />
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
import { ENTRY_CATEGORIES } from '../shared/entry-categories'
import { MAX_NAME_LENGTH, MAX_SERIAL_NO_LENGTH } from '../shared/entry-limits'
import { LOCATIONS } from '../shared/locations'
import { isValidPurchaseDate } from '../shared/purchaseDate'
import type { NewEntryInput } from '../shared/types'
import { parseDateInput } from './parseDateInput'
import { parseEurInput } from './parseEurInput'

const props = withDefaults(
  defineProps<{ modelValue: boolean; error?: string | null; saving?: boolean }>(),
  { error: null, saving: false },
)

type Rule = (value: unknown) => true | string

const optional =
  (rule: Rule): Rule =>
  (value) =>
    value ? rule(value) : true

const nameRules: Rule[] = [
  (value) => String(value ?? '').trim() !== '' || 'A name is required.',
  (value) =>
    String(value ?? '').trim().length <= MAX_NAME_LENGTH ||
    `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.`,
]

const serialNoRules: Rule[] = [
  optional(
    (value) =>
      String(value).trim().length <= MAX_SERIAL_NO_LENGTH ||
      `Keep the serial number to ${MAX_SERIAL_NO_LENGTH} characters or fewer.`,
  ),
]

const purchaseDateRules: Rule[] = [
  optional(
    (value) =>
      isValidPurchaseDate(parseDateInput(String(value)) ?? '') ||
      'Enter a real date as DD-MM-YYYY that is not in the future.',
  ),
]

const purchaseValueRules: Rule[] = [
  optional(
    (value) =>
      parseEurInput(String(value)).valid || 'Enter an amount in euros, for example 1.234,56.',
  ),
]

const locationRules: Rule[] = [(value) => Boolean(value) || 'A location is required.']

const categoryRules: Rule[] = [(value) => Boolean(value) || 'A category is required.']

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  save: [entry: NewEntryInput]
}>()

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const form = ref<VForm | null>(null)
const name = ref('')
const serialNo = ref('')
const purchaseDate = ref('')
const purchaseValue = ref('')
const locationId = ref<string | null>(null)
const categoryId = ref<string | null>(null)

// The dialog outlives its content, so without this a closed-and-reopened dialog would still hold
// whatever was typed the last time round.
watch(
  () => props.modelValue,
  (open) => {
    if (open) return

    name.value = ''
    serialNo.value = ''
    purchaseDate.value = ''
    purchaseValue.value = ''
    locationId.value = null
    categoryId.value = null
    form.value?.resetValidation()
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function save(): Promise<void> {
  const result = await form.value?.validate()
  if (!result?.valid) return

  const entry: NewEntryInput = {
    name: name.value.trim(),
    categoryId: categoryId.value ?? '',
    locationId: locationId.value ?? '',
  }

  if (serialNo.value.trim() !== '') entry.serialNo = serialNo.value.trim()
  const date = parseDateInput(purchaseDate.value)
  if (date !== null) entry.purchaseDate = date

  const value = parseEurInput(purchaseValue.value)
  if (value.valid && value.cents !== undefined) entry.purchaseValueCents = value.cents

  emit('save', entry)
}
</script>
