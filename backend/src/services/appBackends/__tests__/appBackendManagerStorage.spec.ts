import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../../../errors/AppError'
import { buildStorageReply, sendToChild } from '../appBackendManager'
import type { StorageRequestMessage } from '../ipcProtocol'

vi.mock('../../appStorage/appStorageService', () => ({
  executeStorageRequest: vi.fn(),
}))

const { executeStorageRequest } = await import('../../appStorage/appStorageService')
const executeStorageRequestMock = vi.mocked(executeStorageRequest)

function storageRequest(overrides: Partial<StorageRequestMessage> = {}): StorageRequestMessage {
  return {
    type: 'storage-request',
    requestId: 'storage-1',
    operation: 'query',
    collectionName: 'notes',
    ...overrides,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  executeStorageRequestMock.mockReset()
})

describe('buildStorageReply', () => {
  it('executes the request for the appId the Hub knows, ignoring anything in the payload', async () => {
    executeStorageRequestMock.mockResolvedValue([])

    await buildStorageReply('echo-app', {
      ...storageRequest(),
      ...({ appId: 'someone-else' } as Record<string, unknown>),
    })

    expect(executeStorageRequestMock).toHaveBeenCalledTimes(1)
    expect(executeStorageRequestMock.mock.calls[0]?.[0]).toBe('echo-app')
  })

  it('replies with the service result and the matching requestId', async () => {
    executeStorageRequestMock.mockResolvedValue([{ id: 'record-1', text: 'hello' }])

    const reply = await buildStorageReply('echo-app', storageRequest({ requestId: 'storage-42' }))

    expect(reply).toEqual({
      type: 'storage-response',
      requestId: 'storage-42',
      result: [{ id: 'record-1', text: 'hello' }],
    })
  })

  it('maps an AppError onto a storage-error carrying the same code', async () => {
    executeStorageRequestMock.mockRejectedValue(
      new AppError('APP_STORAGE_RECORD_NOT_FOUND', 'No record with id "x" exists.', 404),
    )

    const reply = await buildStorageReply('echo-app', storageRequest())

    expect(reply).toEqual({
      type: 'storage-error',
      requestId: 'storage-1',
      errorCode: 'APP_STORAGE_RECORD_NOT_FOUND',
      errorMessage: 'No record with id "x" exists.',
    })
  })

  it('maps an unexpected failure onto APP_STORAGE_UNAVAILABLE and logs it with the appId', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    executeStorageRequestMock.mockRejectedValue(new Error('driver exploded'))

    const reply = await buildStorageReply('echo-app', storageRequest())

    expect(reply).toMatchObject({
      type: 'storage-error',
      errorCode: 'APP_STORAGE_UNAVAILABLE',
    })
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('echo-app'),
      expect.any(Error),
    )
  })

  it('does not leak the internal failure detail to the app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    executeStorageRequestMock.mockRejectedValue(new Error('mongodb://secret-host:27017'))

    const reply = await buildStorageReply('echo-app', storageRequest())

    expect(JSON.stringify(reply)).not.toContain('secret-host')
  })

  it('sends exactly one reply per request', async () => {
    executeStorageRequestMock.mockResolvedValue(null)

    const reply = await buildStorageReply('echo-app', storageRequest({ operation: 'remove' }))

    expect(reply.type).toBe('storage-response')
    expect(executeStorageRequestMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendToChild', () => {
  function fakeChild(connected: boolean): { child: ChildProcess; sent: unknown[] } {
    const sent: unknown[] = []
    const child = Object.assign(new EventEmitter(), {
      connected,
      send: (message: unknown) => {
        sent.push(message)
        return true
      },
    }) as unknown as ChildProcess
    return { child, sent }
  }

  it('sends the reply to a connected child', () => {
    const { child, sent } = fakeChild(true)

    expect(sendToChild(child, { type: 'storage-response', requestId: 'r1', result: null })).toBe(
      true,
    )
    expect(sent).toHaveLength(1)
  })

  it('drops the reply when the child has already exited', () => {
    const { child, sent } = fakeChild(false)

    expect(sendToChild(child, { type: 'storage-response', requestId: 'r1', result: null })).toBe(
      false,
    )
    expect(sent).toHaveLength(0)
  })

  it('drops the reply when there is no child process at all', () => {
    expect(sendToChild(undefined, { type: 'storage-response', requestId: 'r1', result: null })).toBe(
      false,
    )
  })
})
