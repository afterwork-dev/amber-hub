import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { MonthEntryInput, NetworthEntry } from '../shared/types'

const SAVE_FAILED = 'The month could not be saved. Check your connection and try again.'

export function useSaveMonth() {
  const saving = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to the month's stored entries, or to null when the save failed. */
  async function saveMonth(
    month: string,
    entries: MonthEntryInput[],
  ): Promise<NetworthEntry[] | null> {
    saving.value = true
    error.value = null

    try {
      const result = await callAppApi<{ entries: NetworthEntry[] }>('networth', 'PUT', '/months', {
        query: { month },
        body: { entries },
      })
      return result.entries
    } catch {
      error.value = SAVE_FAILED
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, error, saveMonth }
}
