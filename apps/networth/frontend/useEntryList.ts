import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import { compareEntries } from '../shared/entryOrder'
import type { NetworthEntry } from '../shared/types'

const LOAD_FAILED = 'Your net worth could not be loaded. Check your connection and try again.'

export function useEntryList() {
  const entries = ref<NetworthEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadEntries(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await callAppApi<{ entries: NetworthEntry[] }>('networth', 'GET', '/entries')
      entries.value = result.entries
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
  }

  function replaceMonth(month: string, monthEntries: NetworthEntry[]): void {
    entries.value = [
      ...entries.value.filter((entry) => entry.month !== month),
      ...monthEntries,
    ].sort(compareEntries)
  }

  function removeMonth(month: string): void {
    entries.value = entries.value.filter((entry) => entry.month !== month)
  }

  return { entries, loading, error, loadEntries, replaceMonth, removeMonth }
}
