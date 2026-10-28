import { defineStore } from 'pinia'

const USERNAME_KEY = 'auth.username'
const TOKEN_KEY = 'auth.token'

interface AuthState {
  username: string | null
  token: string | null
  expiresIn: string | null
  accessExpiresAt: number | null
  refreshToken: string | null
  refreshExpiresIn: string | null
  refreshExpiresAt: number | null
}

interface PersistedToken {
  token: string
  expiresIn: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresIn: string
  refreshExpiresAt: number
}

export interface SetSessionInput {
  username: string
  token: string
  expiresIn: string
  refreshToken: string
  refreshExpiresIn: string
}

const EMPTY_STATE: AuthState = {
  username: null,
  token: null,
  expiresIn: null,
  accessExpiresAt: null,
  refreshToken: null,
  refreshExpiresIn: null,
  refreshExpiresAt: null,
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(duration.trim())
  if (!match) {
    return 0
  }
  const [, amount = '0', unit = 's'] = match
  const value = Number(amount)
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return value * unitMs[unit.toLowerCase()]!
}

function readPersistedState(): AuthState {
  const username = window.localStorage.getItem(USERNAME_KEY)

  try {
    const raw = window.localStorage.getItem(TOKEN_KEY)
    if (!raw) {
      return { ...EMPTY_STATE }
    }
    const persisted = JSON.parse(raw) as PersistedToken
    return {
      username,
      token: persisted.token,
      expiresIn: persisted.expiresIn,
      accessExpiresAt: persisted.accessExpiresAt,
      refreshToken: persisted.refreshToken,
      refreshExpiresIn: persisted.refreshExpiresIn,
      refreshExpiresAt: persisted.refreshExpiresAt,
    }
  } catch {
    return { ...EMPTY_STATE }
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => readPersistedState(),
  getters: {
    isAccessTokenExpired: (state): boolean =>
      state.accessExpiresAt === null || Date.now() >= state.accessExpiresAt,
    canRenew: (state): boolean =>
      state.refreshExpiresAt !== null && Date.now() < state.refreshExpiresAt,
    isAuthenticated(): boolean {
      return this.token !== null && !this.isAccessTokenExpired
    },
  },
  actions: {
    setSession(input: SetSessionInput): void {
      const accessExpiresAt = Date.now() + parseDurationMs(input.expiresIn)
      const refreshExpiresAt = Date.now() + parseDurationMs(input.refreshExpiresIn)

      this.username = input.username
      this.token = input.token
      this.expiresIn = input.expiresIn
      this.accessExpiresAt = accessExpiresAt
      this.refreshToken = input.refreshToken
      this.refreshExpiresIn = input.refreshExpiresIn
      this.refreshExpiresAt = refreshExpiresAt

      window.localStorage.setItem(USERNAME_KEY, input.username)
      window.localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({
          token: input.token,
          expiresIn: input.expiresIn,
          accessExpiresAt,
          refreshToken: input.refreshToken,
          refreshExpiresIn: input.refreshExpiresIn,
          refreshExpiresAt,
        }),
      )
    },
    clearSession(): void {
      Object.assign(this, EMPTY_STATE)
      window.localStorage.removeItem(USERNAME_KEY)
      window.localStorage.removeItem(TOKEN_KEY)
    },
  },
})
