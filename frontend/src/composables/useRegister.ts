import { ref, type Ref } from 'vue'
import { HttpClientError } from '../services/httpClient'
import { register } from '../services/userService'
import { useAuthStore } from '../stores/authStore'

export interface UseRegister {
  loading: Ref<boolean>
  error: Ref<string | null>
  errorCode: Ref<string | undefined>
  success: Ref<boolean>
  submit: (username: string, password: string) => Promise<void>
}

export function useRegister(): UseRegister {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | undefined>(undefined)
  const success = ref(false)

  async function submit(username: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    errorCode.value = undefined
    success.value = false

    try {
      const result = await register(username, password)
      useAuthStore().setSession(result)
      success.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to register'
      errorCode.value = err instanceof HttpClientError ? err.errorCode : undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, error, errorCode, success, submit }
}
