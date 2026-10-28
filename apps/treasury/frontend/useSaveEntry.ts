import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { NewEntryInput, TreasuryEntry } from '../shared/types'

const SAVE_FAILED = 'The entry could not be saved. Check your connection and try again.'

export function useSaveEntry() {
  const saving = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to the stored entry, or to null when the save failed. */
  async function saveEntry(input: NewEntryInput): Promise<TreasuryEntry | null> {
    saving.value = true
    error.value = null

    try {
      return await callAppApi<TreasuryEntry>('treasury', 'POST', '/entries', { body: input })
    } catch {
      error.value = SAVE_FAILED
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, error, saveEntry }
}
