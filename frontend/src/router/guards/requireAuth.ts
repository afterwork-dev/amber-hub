import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { renewSession } from '../../services/httpClient'

export const requireAuth: NavigationGuardWithThis<undefined> = async (to) => {
  if (!to.meta.requiresAuth) {
    return true
  }

  const authStore = useAuthStore()
  if (!authStore.isAccessTokenExpired) {
    return true
  }

  if (authStore.canRenew && (await renewSession())) {
    return true
  }

  authStore.clearSession()
  return { name: 'login' }
}
