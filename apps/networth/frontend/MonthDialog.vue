<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="xs"
    max-width="960"
    scrollable
    aria-labelledby="networth-month-title"
    @update:model-value="close"
  >
    <v-card>
      <v-card-title id="networth-month-title" tag="h2">{{ title }}</v-card-title>

      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" role="alert" class="mb-4">
          {{ error }}
        </v-alert>

        <v-form ref="form" validate-on="submit">
          <v-row dense>
            <v-col cols="6">
              <v-select
                v-model="monthNumber"
                label="Month"
                :items="MONTH_OPTIONS"
                :rules="monthRules"
                :disabled="editing"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="year"
                label="Year"
                :items="years"
                :rules="yearRules"
                :disabled="editing"
              />
            </v-col>
          </v-row>

          <h3 class="text-subtitle-2 mt-2 mb-3">Entries</h3>

          <template v-for="(row, index) in rows" :key="row.key">
            <v-divider v-if="xs && index > 0" class="mb-4" />
            <month-entry-row
              v-model:name="row.name"
              v-model:category="row.category"
              v-model:amount="row.amount"
              v-model:quantity="row.quantity"
              :index="index"
              :removable="rows.length > 1"
              :autofocus="row.key === focusKey"
              @remove="rows.splice(index, 1)"
            />
          </template>

          <v-btn
            text="Add entry"
            :prepend-icon="PLUS"
            variant="text"
            class="mt-1"
            @click="addRow"
          />
        </v-form>

        <v-row dense class="mt-4" aria-live="polite">
          <v-col v-for="total in totals" :key="total.label" cols="4">
            <p class="text-caption text-medium-emphasis">{{ total.label }}</p>
            <p class="text-body-1">{{ formatEur(total.cents) }}</p>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="month"
          text="Delete month"
          color="error"
          :disabled="saving"
          @click="emit('delete', month)"
        />
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
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import type { VForm } from 'vuetify/components/VForm'
import { isValidMonth } from '../shared/entryMonth'
import { totalsOf } from '../shared/totals'
import type { MonthEntryInput, NetworthEntry } from '../shared/types'
import MonthEntryRow from './MonthEntryRow.vue'
import type { Rule } from './fieldRules'
import { formatEur } from './formatEur'
import { PLUS } from './icons'
import {
  defaultNewMonth,
  editRows,
  emptyRow,
  monthFrom,
  prefillRows,
  rowValueCents,
  toMonthEntry,
  yearOptions,
  type DraftRow,
} from './monthDraft'
import { formatMonth, MONTH_OPTIONS } from './monthLabel'
import { entriesOf } from './monthSummary'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** The month being edited, or null for a new month */
    month: string | null
    entries: NetworthEntry[]
    error?: string | null
    saving?: boolean
  }>(),
  { error: null, saving: false },
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  save: [month: string, entries: MonthEntryInput[]]
  delete: [month: string]
}>()

// Vuetify's `mobile` covers everything below 1280px, which would give a laptop window a
// fullscreen form. Only phone-width viewports need one.
const { xs } = useDisplay()

const form = ref<VForm | null>(null)
const monthNumber = ref<number | null>(null)
const year = ref<number | null>(null)
const rows = ref<DraftRow[]>([])
const focusKey = ref<number | null>(null)

const editing = computed(() => props.month !== null)
const title = computed(() => (props.month ? formatMonth(props.month) : 'New month'))
const recordedMonths = computed(() => [...new Set(props.entries.map((entry) => entry.month))])
const years = computed(() => yearOptions(recordedMonths.value))
const selectedMonth = computed(() =>
  monthNumber.value && year.value ? monthFrom(year.value, monthNumber.value) : '',
)

const totals = computed(() => {
  const values = rows.value.map(rowValueCents).filter((value) => value !== null)
  const { assetsCents, liabilitiesCents, networthCents } = totalsOf(values)

  return [
    { label: 'Assets', cents: assetsCents },
    { label: 'Liabilities', cents: liabilitiesCents },
    { label: 'Net worth', cents: networthCents },
  ]
})

const monthRules: Rule[] = [
  (value) => Boolean(value) || 'A month is required.',
  () =>
    editing.value ||
    !recordedMonths.value.includes(selectedMonth.value) ||
    `${formatMonth(selectedMonth.value)} is already recorded. Open it from the table to edit it.`,
  () => isValidMonth(selectedMonth.value) || 'Pick a month that is not in the future.',
]

const yearRules: Rule[] = [(value) => Boolean(value) || 'A year is required.']

function start(): void {
  const latest = [...recordedMonths.value].sort().at(-1)
  const month = props.month ?? defaultNewMonth(latest)
  const [startYear = null, startMonth = null] = month.split('-').map(Number)

  year.value = startYear
  monthNumber.value = startMonth
  focusKey.value = null
  if (props.month) rows.value = editRows(entriesOf(props.entries, props.month))
  else if (latest) rows.value = prefillRows(entriesOf(props.entries, latest))
  else rows.value = [emptyRow()]
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) start()
    else form.value?.resetValidation()
  },
  { immediate: true },
)

function addRow(): void {
  const row = emptyRow()
  rows.value.push(row)
  focusKey.value = row.key
}

function close(): void {
  emit('update:modelValue', false)
}

async function save(): Promise<void> {
  const result = await form.value?.validate()
  if (!result?.valid) return

  const entries = rows.value.map(toMonthEntry).filter((entry) => entry !== null)
  if (entries.length !== rows.value.length) return

  emit('save', selectedMonth.value, entries)
}
</script>
