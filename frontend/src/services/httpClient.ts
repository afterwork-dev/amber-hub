import type { ApiResponse } from '@amber-hub/shared'
import { useAuthStore } from '../stores/authStore'
import { refresh } from './userService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
const AUTH_PATH_PREFIX = '/auth/'

export class HttpClientError extends Error {
  readonly errorCode?: string
  readonly details?: string[]

  constructor(message: string, errorCode?: string, details?: string[]) {
    super(message)
    this.name = 'HttpClientError'
    this.errorCode = errorCode
    this.details = details
  }
}

let inFlightRenewal: Promise<boolean> | null = null

export function renewSession(): Promise<boolean> {
  if (!inFlightRenewal) {
    inFlightRenewal = performRenewal().finally(() => {
      inFlightRenewal = null
    })
  }
  return inFlightRenewal
}

async function performRenewal(): Promise<boolean> {
  const authStore = useAuthStore()
  if (!authStore.refreshToken || !authStore.canRenew) {
    return false
  }

  try {
    const result = await refresh(authStore.refreshToken)
    authStore.setSession(result)
    return true
  } catch {
    return false
  }
}

function authHeader(path: string): { Authorization: string } | undefined {
  if (path.startsWith(AUTH_PATH_PREFIX)) {
    return undefined
  }
  const token = useAuthStore().token
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

async function requestWithRenewal<T>(path: string, doFetch: () => Promise<Response>): Promise<T> {
  try {
    return await unwrap<T>(doFetch())
  } catch (error) {
    const isRenewableFailure =
      error instanceof HttpClientError &&
      error.errorCode === 'UNAUTHORIZED' &&
      !path.startsWith(AUTH_PATH_PREFIX)

    if (isRenewableFailure) {
      if (await renewSession()) {
        return unwrap<T>(doFetch())
      }
      await redirectToLoginOnce()
    }

    throw error
  }
}

async function redirectToLoginOnce(): Promise<void> {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }
  authStore.clearSession()
  
  
  const { default: router } = await import('../router')
  router.push({ name: 'login' })
}

export async function httpGet<T>(path: string): Promise<T> {
  return requestWithRenewal<T>(path, () =>
    fetch(`${API_BASE_URL}${path}`, { headers: authHeader(path), credentials: 'include' })
  )
}

export async function httpPost<T>(path: string, payload: unknown): Promise<T> {
  return requestWithRenewal<T>(path, () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(path) },
      body: JSON.stringify(payload),
      credentials: 'include',
    }),
  )
}

export async function httpDelete<T>(path: string): Promise<T> {
  return requestWithRenewal<T>(path, () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: authHeader(path),
      credentials: 'include',
    }),
  )
}

export function parseApiResponse<T>(body: ApiResponse<T> | undefined): T {
  if (!body?.success || body.data === undefined || body.data === null) {
    throw new HttpClientError(
      body?.error?.errorMessage ?? 'Request failed',
      body?.error?.errorCode,
      body?.error?.details,
    )
  }

  return body.data
}

async function unwrap<T>(fetchPromise: Promise<Response>): Promise<T> {
  let response: Response
  try {
    response = await fetchPromise
  } catch {
    throw new HttpClientError('Unable to reach the server')
  }

  let body: ApiResponse<T> | undefined
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    throw new HttpClientError('Received an invalid response from the server')
  }

  return parseApiResponse(body)
}
