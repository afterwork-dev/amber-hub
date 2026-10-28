import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'

const DELETE_FAILED = 'The transaction could not be deleted. Check your connection and try again.'

export function useDeleteEntry() {
  const deleting = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to whether the transaction is gone. */
  async function deleteEntry(id: string): Promise<boolean> {
    deleting.value = true
    error.value = null

    try {
      await callAppApi('investment-income', 'DELETE', '/entries', { query: { id } })
      return true
    } catch {
      error.value = DELETE_FAILED
      return false
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, deleteEntry }
}
