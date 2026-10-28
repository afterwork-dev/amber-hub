import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { InvestmentIncomeEntry } from '../shared/types'

const LOAD_FAILED = 'The entries could not be loaded. Check your connection and try again.'

export function useEntryList() {
  const entries = ref<InvestmentIncomeEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadEntries(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await callAppApi<{ entries: InvestmentIncomeEntry[] }>('investment-income', 'GET', '/entries')
      entries.value = result.entries
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
  }

  /** Adds an already-stored entry, sparing the totals a refetch. Order is irrelevant to a sum. */
  function addEntry(entry: InvestmentIncomeEntry): void {
    entries.value = [entry, ...entries.value]
  }

  function removeEntry(id: string): void {
    entries.value = entries.value.filter((entry) => entry.id !== id)
  }

  function removeEntriesForAsset(assetId: string): void {
    entries.value = entries.value.filter((entry) => entry.assetId !== assetId)
  }

  return { entries, loading, error, loadEntries, addEntry, removeEntry, removeEntriesForAsset }
}
