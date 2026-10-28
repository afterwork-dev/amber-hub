import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'

const DELETE_FAILED = 'The asset could not be deleted. Check your connection and try again.'

export function useDeleteAsset() {
  const deleting = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to whether the asset is gone. */
  async function deleteAsset(id: string): Promise<boolean> {
    deleting.value = true
    error.value = null

    try {
      await callAppApi('investment-income', 'DELETE', '/assets', { query: { id } })
      return true
    } catch {
      error.value = DELETE_FAILED
      return false
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, deleteAsset }
}
