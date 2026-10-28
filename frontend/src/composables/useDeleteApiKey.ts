import { ref } from 'vue'
import { HttpClientError } from '../services/httpClient'
import { deleteApiKey } from '../services/apiKeyService'

const DELETE_FAILED = 'The API key could not be deleted. Check your connection and try again.'

export function useDeleteApiKey() {
  const deleting = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to true when the key is gone (deleted now, or already absent). */
  async function remove(id: string): Promise<boolean> {
    deleting.value = true
    error.value = null

    try {
      await deleteApiKey(id)
      return true
    } catch (thrown) {
      if (thrown instanceof HttpClientError && thrown.errorCode === 'NOT_FOUND') {
        return true
      }
      error.value = thrown instanceof HttpClientError ? thrown.message : DELETE_FAILED
      return false
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, remove }
}
