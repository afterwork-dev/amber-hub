<template>
  <v-row dense role="group" :aria-label="`Entry ${index + 1}`">
    <v-col cols="12" md="4">
      <v-text-field
        v-model="name"
        label="Name"
        density="compact"
        :rules="nameRules"
        :autofocus="autofocus"
      />
    </v-col>

    <v-col cols="6" md="3">
      <v-select
        v-model="category"
        label="Category"
        density="compact"
        :items="CATEGORY_ITEMS"
        :rules="categoryRules"
      />
    </v-col>

    <v-col cols="6" md="3">
      <v-text-field
        v-model="amount"
        label="Amount"
        suffix="€"
        inputmode="decimal"
        density="compact"
        :rules="amountRules"
        :hint="valueHint"
        :persistent-hint="valueHint !== undefined"
      >
        <template #append-inner>
          <v-btn
            :icon="PLUS_MINUS"
            size="x-small"
            variant="text"
            aria-label="Switch between asset and liability"
            @click="switchSign"
          />
        </template>
      </v-text-field>
    </v-col>

    <v-col cols="9" md>
      <v-text-field
        v-model="quantity"
        label="Quantity"
        prefix="×"
        inputmode="decimal"
        density="compact"
        :rules="quantityRules"
      />
    </v-col>

    <v-col cols="3" md="auto" class="d-flex justify-end">
      <v-btn
        :icon="DELETE_OUTLINE"
        variant="text"
        density="comfortable"
        :aria-label="`Remove ${name.trim() || `entry ${index + 1}`}`"
        :disabled="!removable"
        @click="emit('remove')"
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORIES, type Category } from '../shared/categories'
import { MAX_NAME_LENGTH } from '../shared/entry-limits'
import { isValidAmountCents, isValidQuantity } from '../shared/entryValue'
import { optional, requiredText, type Rule } from './fieldRules'
import { formatEur } from './formatEur'
import { DELETE_OUTLINE, PLUS_MINUS } from './icons'
import { rowValueCents } from './monthDraft'
import { parseEurInput } from './parseEurInput'
import { parseQuantityInput } from './parseQuantityInput'

defineProps<{ index: number; removable: boolean; autofocus?: boolean }>()

const emit = defineEmits<{ remove: [] }>()

const name = defineModel<string>('name', { required: true })
const category = defineModel<Category | null>('category', { required: true })
const amount = defineModel<string>('amount', { required: true })
const quantity = defineModel<string>('quantity', { required: true })

const CATEGORY_ITEMS = [...CATEGORIES]

const required =
  (message: string): Rule =>
  (value) =>
    String(value ?? '').trim() !== '' || message

const nameRules = requiredText('name', MAX_NAME_LENGTH)

const categoryRules: Rule[] = [(value) => Boolean(value) || 'A category is required.']

const amountRules: Rule[] = [
  required('An amount is required.'),
  optional((value) => {
    const parsed = parseEurInput(String(value))
    return (
      (parsed.valid && parsed.cents !== undefined) ||
      'Enter an amount in euros, for example -1.234,56.'
    )
  }),
  optional((value) => {
    const parsed = parseEurInput(String(value))
    return !parsed.valid || isValidAmountCents(parsed.cents ?? 0) || 'Enter a smaller amount.'
  }),
]

const quantityRules: Rule[] = [
  required('A quantity is required.'),
  optional((value) => {
    const parsed = parseQuantityInput(String(value))
    return (
      (parsed !== null && isValidQuantity(parsed)) ||
      'Enter a quantity above zero with up to four decimals.'
    )
  }),
]

const valueHint = computed(() => {
  const value = rowValueCents({ amount: amount.value, quantity: quantity.value })
  if (value === null || parseQuantityInput(quantity.value) === 1) return undefined

  return `= ${formatEur(value)}`
})

function switchSign(): void {
  amount.value = amount.value.startsWith('-') ? amount.value.slice(1) : `-${amount.value}`
}
</script>
