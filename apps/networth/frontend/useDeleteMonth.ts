import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'

const DELETE_FAILED = 'The month could not be deleted. Check your connection and try again.'

export function useDeleteMonth() {
  const deleting = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to whether the month is gone. */
  async function deleteMonth(month: string): Promise<boolean> {
    deleting.value = true
    error.value = null

    try {
      await callAppApi('networth', 'DELETE', '/months', { query: { month } })
      return true
    } catch {
      error.value = DELETE_FAILED
      return false
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, deleteMonth }
}
