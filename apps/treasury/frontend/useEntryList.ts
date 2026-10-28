import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { TreasuryEntry } from '../shared/types'

const LOAD_FAILED = 'The entries could not be loaded. Check your connection and try again.'

export function useEntryList() {
  const entries = ref<TreasuryEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadEntries(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await callAppApi<{ entries: TreasuryEntry[] }>('treasury', 'GET', '/entries')
      entries.value = result.entries
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
  }

  /** Places an already-stored entry at the top, sparing the list a refetch. */
  function addEntry(entry: TreasuryEntry): void {
    entries.value = [entry, ...entries.value]
  }

  return { entries, loading, error, loadEntries, addEntry }
}
