import type { ApiResponse } from '@amber-hub/shared'

export interface AppApiError extends Error {
  errorCode: string
  errorMessage: string
  details?: string[]
}

function createAppApiError(errorCode: string, errorMessage: string, details?: string[]): AppApiError {
  const error = new Error(errorMessage) as AppApiError
  error.errorCode = errorCode
  error.errorMessage = errorMessage
  if (details) {
    error.details = details
  }
  return error
}

export async function callAppApi<T = unknown>(
  appId: string,
  method: string,
  path: string,
  options?: { query?: Record<string, string>; body?: unknown },
): Promise<T> {
  const queryString = options?.query ? `?${new URLSearchParams(options.query).toString()}` : ''
  const url = `/app-api/${appId}${path}${queryString}`

  let response: ApiResponse<T>
  try {
    const fetchResponse = await fetch(url, {
      method,
      headers: options?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
    response = (await fetchResponse.json()) as ApiResponse<T>
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Failed to reach the App backend'
    throw createAppApiError('APP_API_TRANSPORT_ERROR', message)
  }

  if (!response.success || response.error) {
    const { errorCode, errorMessage, details } = response.error ?? {
      errorCode: 'APP_API_TRANSPORT_ERROR',
      errorMessage: 'The App backend returned an unsuccessful response with no error details',
    }
    throw createAppApiError(errorCode, errorMessage, details)
  }

  return response.data as T
}
