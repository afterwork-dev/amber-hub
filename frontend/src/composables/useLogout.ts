import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

export interface UseLogout {
  logout: () => void
}

export function useLogout(): UseLogout {
  const router = useRouter()

  function logout(): void {
    useAuthStore().clearSession()
    router.push({ name: 'login' })
  }

  return { logout }
}
