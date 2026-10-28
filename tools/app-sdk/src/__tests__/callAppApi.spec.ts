import { afterEach, describe, expect, it, vi } from 'vitest'
import { callAppApi, type AppApiError } from '../callAppApi'
import type { ApiResponse } from '@amber-hub/shared'

function mockFetchOnce(response: ApiResponse<unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(response),
    }),
  )
}

async function expectAppApiError(promise: Promise<unknown>, errorCode: string) {
  await expect(promise).rejects.toMatchObject({ errorCode } satisfies Partial<AppApiError>)
}

describe('callAppApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves with the handler result on success', async () => {
    mockFetchOnce({ success: true, data: { calledBy: 'alice' }, error: null })

    const result = await callAppApi<{ calledBy: string }>('echo-app', 'GET', '/whoami')

    expect(result).toEqual({ calledBy: 'alice' })
  })

  it('builds the request URL, method, query string, and JSON body', async () => {
    mockFetchOnce({ success: true, data: null, error: null })

    await callAppApi('echo-app', 'POST', '/greet', {
      query: { name: 'alice' },
      body: { message: 'hi' },
    })

    expect(fetch).toHaveBeenCalledWith(
      '/app-api/echo-app/greet?name=alice',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'hi' }),
      }),
    )
  })

  it.each([
    'APP_BACKEND_ROUTE_NOT_FOUND',
    'APP_BACKEND_HANDLER_ERROR',
    'APP_BACKEND_NOT_DECLARED',
    'APP_BACKEND_START_FAILED',
    'APP_BACKEND_TIMEOUT',
  ])('rejects with an AppApiError carrying %s', async (errorCode) => {
    mockFetchOnce({
      success: false,
      data: null,
      error: { errorCode, errorMessage: 'something went wrong' },
    })

    await expectAppApiError(callAppApi('echo-app', 'GET', '/whoami'), errorCode)
  })

  it('rejects with APP_API_TRANSPORT_ERROR when fetch itself rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    await expectAppApiError(callAppApi('echo-app', 'GET', '/whoami'), 'APP_API_TRANSPORT_ERROR')
  })

  it('rejects with APP_API_TRANSPORT_ERROR when the response body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    )

    await expectAppApiError(callAppApi('echo-app', 'GET', '/whoami'), 'APP_API_TRANSPORT_ERROR')
  })
})
