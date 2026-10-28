<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="520"
    aria-labelledby="investment-income-new-entry-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="investment-income-new-entry-title" tag="h2">New entry</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <v-form ref="form" validate-on="submit">
          <v-text-field
            v-model="payoutDate"
            label="Payout date"
            placeholder="DD-MM-YYYY"
            persistent-placeholder
            :rules="payoutDateRules"
          />
          <v-text-field
            v-model="amount"
            label="Amount"
            suffix="€"
            inputmode="decimal"
            :rules="amountRules"
          />

          <v-alert v-if="assetsError" type="error" variant="tonal" role="alert" class="mb-4">
            {{ assetsError }}
            <div>
              <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry-assets')" />
            </div>
          </v-alert>

          <v-select
            v-model="assetId"
            label="Asset"
            :items="assets"
            item-title="name"
            item-value="id"
            :rules="assetRules"
            :no-data-text="NO_ASSETS"
            :hint="assets.length === 0 ? NO_ASSETS : undefined"
            :persistent-hint="assets.length === 0"
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
import { isValidPayoutDate } from '../shared/payoutDate'
import type { InvestmentIncomeAsset, NewEntryInput } from '../shared/types'
import { optional, type Rule } from './fieldRules'
import { parseDateInput } from './parseDateInput'
import { parseEurInput } from './parseEurInput'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    assets: InvestmentIncomeAsset[]
    error?: string | null
    assetsError?: string | null
    saving?: boolean
  }>(),
  { error: null, assetsError: null, saving: false },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  save: [entry: NewEntryInput]
  'retry-assets': []
}>()

const NO_ASSETS = 'Add an asset with “New Asset” first.'

const required =
  (message: string): Rule =>
  (value) =>
    String(value ?? '').trim() !== '' || message

const payoutDateRules: Rule[] = [
  required('A payout date is required.'),
  optional(
    (value) =>
      isValidPayoutDate(parseDateInput(String(value)) ?? '') ||
      'Enter a real date as DD-MM-YYYY that is not in the future.',
  ),
]

const amountRules: Rule[] = [
  required('An amount is required.'),
  optional(
    (value) =>
      parseEurInput(String(value)).valid || 'Enter an amount in euros, for example 1.234,56.',
  ),
  optional((value) => {
    const parsed = parseEurInput(String(value))
    return !parsed.valid || (parsed.cents ?? 0) > 0 || 'Enter an amount greater than zero.'
  }),
]

const assetRules: Rule[] = [(value) => Boolean(value) || 'An asset is required.']

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const form = ref<VForm | null>(null)
const payoutDate = ref('')
const amount = ref('')
const assetId = ref<string | null>(null)

// The dialog outlives its content, so without this a closed-and-reopened dialog would still hold
// whatever was typed the last time round.
watch(
  () => props.modelValue,
  (open) => {
    if (open) return

    payoutDate.value = ''
    amount.value = ''
    assetId.value = null
    form.value?.resetValidation()
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function save(): Promise<void> {
  const result = await form.value?.validate()
  if (!result?.valid) return

  const date = parseDateInput(payoutDate.value)
  const parsed = parseEurInput(amount.value)
  if (date === null || !parsed.valid || parsed.cents === undefined) return

  emit('save', {
    payoutDate: date,
    amountCents: parsed.cents,
    assetId: assetId.value ?? '',
  })
}
</script>
