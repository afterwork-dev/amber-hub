import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { NewAssetInput, InvestmentIncomeAsset } from '../shared/types'

const SAVE_FAILED = 'The asset could not be saved. Check your connection and try again.'

export function useSaveAsset() {
  const saving = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to the stored asset, or to null when the save failed. */
  async function saveAsset(input: NewAssetInput): Promise<InvestmentIncomeAsset | null> {
    saving.value = true
    error.value = null

    try {
      return await callAppApi<InvestmentIncomeAsset>('investment-income', 'POST', '/assets', {
        body: input,
      })
    } catch {
      error.value = SAVE_FAILED
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, error, saveAsset }
}
