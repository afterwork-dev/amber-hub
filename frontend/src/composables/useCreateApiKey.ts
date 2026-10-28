import { ref } from 'vue'
import { HttpClientError } from '../services/httpClient'
import {
  createApiKey as postApiKey,
  type CreateApiKeyInput,
  type CreatedApiKey,
} from '../services/apiKeyService'

const CREATE_FAILED = 'The API key could not be created. Check your connection and try again.'

export function useCreateApiKey() {
  const saving = ref(false)
  const error = ref<string | null>(null)

  /** Resolves to the created key, or to null when creation failed. */
  async function create(input: CreateApiKeyInput): Promise<CreatedApiKey | null> {
    saving.value = true
    error.value = null

    try {
      return await postApiKey(input)
    } catch (thrown) {
      error.value = thrown instanceof HttpClientError ? thrown.message : CREATE_FAILED
      return null
    } finally {
      saving.value = false
    }
  }

  return { saving, error, create }
}
