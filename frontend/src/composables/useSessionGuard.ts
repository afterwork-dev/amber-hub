import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { renewSession } from '../services/httpClient'

export interface UseSessionGuard {
  checkSession: () => Promise<void>
}

export function useSessionGuard(): UseSessionGuard {
  const router = useRouter()
  const authStore = useAuthStore()

  async function checkSession(): Promise<void> {
    if (!authStore.isAccessTokenExpired) {
      return
    }

    if (authStore.canRenew && (await renewSession())) {
      return
    }

    authStore.clearSession()
    if (router.currentRoute.value.meta.requiresAuth) {
      router.push({ name: 'login' })
    }
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      checkSession()
    }
  }

  window.addEventListener('focus', checkSession)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return { checkSession }
}
