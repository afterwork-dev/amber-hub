<template>
  <v-layout class="investment-income-shell" :style="{ height: `${height}px` }">
    <asset-detail
      v-if="selectedAsset"
      ref="detail"
      :name="selectedAsset.name"
      :transactions="selectedTransactions"
      @back="closeAsset"
      @delete-transaction="askDeleteTransaction"
      @delete-asset="askDeleteAsset"
    />

    <template v-else>
      <v-app-bar absolute flat class="investment-income-header">
        <v-app-bar-title>
          <h1 class="investment-income-title">Investment Income</h1>
        </v-app-bar-title>

        <template #append>
          <v-btn
            text="New Asset"
            variant="outlined"
            color="primary"
            class="mr-2"
            @click="openAssetDialog"
          />
          <v-btn text="New" variant="flat" color="primary" @click="openDialog" />
        </template>
      </v-app-bar>

      <v-main class="investment-income-content">
        <asset-income-cards
          :summaries="summaries"
          :loading="entriesLoading || assetsLoading"
          :error="loadError ?? assetsLoadError"
          @retry="reload"
          @select="openAsset"
        >
          <yearly-income-chart v-if="yearlyIncome.length > 0" :years="yearlyIncome" />
        </asset-income-cards>
      </v-main>
    </template>

    <new-entry-dialog
      v-model="dialogOpen"
      :assets="assets"
      :assets-error="assetsLoadError"
      :error="saveError"
      :saving="saving"
      @save="onSave"
      @retry-assets="loadAssets"
    />

    <new-asset-dialog
      v-model="assetDialogOpen"
      :error="assetSaveError"
      :saving="assetSaving"
      @save="onSaveAsset"
    />

    <confirm-dialog
      :model-value="pendingTransaction !== null"
      title="Delete transaction?"
      :message="transactionDeleteMessage"
      confirm-text="Delete"
      :busy="deletingEntry"
      :error="deleteEntryError"
      @update:model-value="pendingTransaction = null"
      @confirm="onDeleteTransaction"
    />

    <confirm-dialog
      :model-value="pendingAsset !== null"
      title="Delete asset?"
      :message="assetDeleteMessage"
      confirm-text="Delete asset"
      :busy="deletingAsset"
      :error="deleteAssetError"
      @update:model-value="pendingAsset = null"
      @confirm="onDeleteAsset"
    />

    <v-snackbar v-model="confirmationVisible" timeout="4000" role="status" aria-live="polite">
      {{ confirmation }}
    </v-snackbar>
  </v-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { compareEntries } from '../shared/entryOrder'
import type {
  InvestmentIncomeAsset,
  InvestmentIncomeEntry,
  NewAssetInput,
  NewEntryInput,
} from '../shared/types'
import AssetDetail from './AssetDetail.vue'
import AssetIncomeCards from './AssetIncomeCards.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import NewAssetDialog from './NewAssetDialog.vue'
import NewEntryDialog from './NewEntryDialog.vue'
import YearlyIncomeChart from './YearlyIncomeChart.vue'
import { summarizeAssetIncome, summarizeYearlyIncome } from './assetIncome'
import { formatEur, formatPayoutDate } from './formatEntry'
import { useAvailableHeight } from './useAvailableHeight'
import { useAssetList } from './useAssetList'
import { useDeleteAsset } from './useDeleteAsset'
import { useDeleteEntry } from './useDeleteEntry'
import { useEntryList } from './useEntryList'
import { useSaveAsset } from './useSaveAsset'
import { useSaveEntry } from './useSaveEntry'

const props = defineProps<{ host: Element }>()

const { height, stop } = useAvailableHeight(props.host)
const {
  entries,
  loading: entriesLoading,
  error: loadError,
  loadEntries,
  addEntry,
  removeEntry,
  removeEntriesForAsset,
} = useEntryList()
const {
  deleting: deletingEntry,
  error: deleteEntryError,
  deleteEntry,
} = useDeleteEntry()
const {
  deleting: deletingAsset,
  error: deleteAssetError,
  deleteAsset,
} = useDeleteAsset()
const { saving, error: saveError, saveEntry } = useSaveEntry()
const { saving: assetSaving, error: assetSaveError, saveAsset } = useSaveAsset()
const {
  assets,
  loading: assetsLoading,
  error: assetsLoadError,
  loadAssets,
  addAsset,
  removeAsset,
} = useAssetList()

const summaries = computed(() => summarizeAssetIncome(assets.value, entries.value))
const yearlyIncome = computed(() => summarizeYearlyIncome(assets.value, entries.value))

const selectedAssetId = ref<string | null>(null)

/** Resolved rather than stored, so an asset that disappears closes its view on its own. */
const selectedAsset = computed(
  () => assets.value.find((asset) => asset.id === selectedAssetId.value) ?? null,
)

const selectedTransactions = computed(() =>
  entries.value.filter((entry) => entry.assetId === selectedAssetId.value).sort(compareEntries),
)

const detail = ref<InstanceType<typeof AssetDetail> | null>(null)
const pendingTransaction = ref<InvestmentIncomeEntry | null>(null)

const transactionDeleteMessage = computed(() => {
  const pending = pendingTransaction.value
  if (!pending) return ''

  const date = formatPayoutDate(pending.payoutDate)
  return `The payout of ${formatEur(pending.amountCents)} on ${date} will be deleted. This cannot be undone.`
})

const pendingAsset = ref<InvestmentIncomeAsset | null>(null)

const assetDeleteMessage = computed(() => {
  const pending = pendingAsset.value
  if (!pending) return ''

  const count = entries.value.filter((entry) => entry.assetId === pending.id).length
  const noun = count === 1 ? 'transaction' : 'transactions'
  return `${pending.name} and its ${count} ${noun} will be deleted. This cannot be undone.`
})

const dialogOpen = ref(false)
const assetDialogOpen = ref(false)
const confirmationVisible = ref(false)
const confirmation = ref('')

function reload(): void {
  loadEntries()
  loadAssets()
}

function openAsset(assetId: string): void {
  selectedAssetId.value = assetId
}

function closeAsset(): void {
  selectedAssetId.value = null
}

function askDeleteTransaction(entryId: string): void {
  deleteEntryError.value = null
  pendingTransaction.value = entries.value.find((entry) => entry.id === entryId) ?? null
}

async function onDeleteTransaction(): Promise<void> {
  const pending = pendingTransaction.value
  if (!pending || !(await deleteEntry(pending.id))) return

  removeEntry(pending.id)
  pendingTransaction.value = null
  confirm('Transaction deleted')

  await nextTick()
  detail.value?.focusList()
}

function askDeleteAsset(): void {
  deleteAssetError.value = null
  pendingAsset.value = selectedAsset.value
}

async function onDeleteAsset(): Promise<void> {
  const pending = pendingAsset.value
  if (!pending || !(await deleteAsset(pending.id))) return

  removeEntriesForAsset(pending.id)
  removeAsset(pending.id)
  pendingAsset.value = null
  selectedAssetId.value = null
  confirm('Asset deleted')
}

function confirm(message: string): void {
  confirmation.value = message
  confirmationVisible.value = true
}

function openDialog(): void {
  saveError.value = null
  dialogOpen.value = true
}

async function onSave(entry: NewEntryInput): Promise<void> {
  const stored = await saveEntry(entry)
  if (!stored) return

  addEntry(stored)
  dialogOpen.value = false
  confirm('Entry saved')
}

function openAssetDialog(): void {
  assetSaveError.value = null
  assetDialogOpen.value = true
}

async function onSaveAsset(asset: NewAssetInput): Promise<void> {
  const stored = await saveAsset(asset)
  if (!stored) return

  addAsset(stored)
  assetDialogOpen.value = false
  confirm('Asset saved')
}

onMounted(reload)
onUnmounted(stop)
</script>
