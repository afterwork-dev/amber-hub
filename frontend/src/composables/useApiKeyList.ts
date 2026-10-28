import { ref } from 'vue'
import {
  listApiKeys,
  type ApiKeySummary,
  type CreatedApiKey,
} from '../services/apiKeyService'

const LOAD_FAILED = 'Your API keys could not be loaded. Check your connection and try again.'

export function useApiKeyList() {
  const apiKeys = ref<ApiKeySummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      apiKeys.value = await listApiKeys()
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
  }

  /** Places a just-created key at the top, copying only the summary fields (never the plaintext). */
  function add(created: CreatedApiKey): void {
    const { id, description, createdAt, expiresAt } = created
    apiKeys.value = [{ id, description, createdAt, expiresAt }, ...apiKeys.value]
  }

  function remove(id: string): void {
    apiKeys.value = apiKeys.value.filter((apiKey) => apiKey.id !== id)
  }

  return { apiKeys, loading, error, load, add, remove }
}
