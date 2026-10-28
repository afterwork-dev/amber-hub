import { describe, it, expect } from 'vitest'
import { createAppManager, dispatchCall, dispatchToolCall, toDeclarations } from '../appBackendRunner'
import type {
  CallRequestMessage,
  RunnerToHubMessage,
  StorageRequestMessage,
  ToolCallRequestMessage,
} from '../ipcProtocol'

function createRecordingManager(): {
  manager: ReturnType<typeof createAppManager>
  sent: RunnerToHubMessage[]
} {
  const sent: RunnerToHubMessage[] = []
  const manager = createAppManager((message) => sent.push(message))
  return { manager, sent }
}

function lastStorageRequest(sent: RunnerToHubMessage[]): StorageRequestMessage {
  const message = sent[sent.length - 1]
  if (message?.type !== 'storage-request') {
    throw new Error('expected the runner to have sent a storage-request message')
  }
  return message
}

function buildCallMessage(overrides: Partial<CallRequestMessage> = {}): CallRequestMessage {
  return {
    type: 'call',
    requestId: 'req-1',
    method: 'GET',
    path: '/x',
    query: {},
    body: null,
    user: { id: 'user-1', username: 'alice' },
    ...overrides,
  }
}

describe('createAppManager / dispatchCall', () => {
  it('invokes the matching registered handler with the correct RouteContext and replies with a response message', async () => {
    const { appManager, routes } = createAppManager(() => {})
    let receivedContext: unknown
    appManager.registerRoute('GET', '/x', (context) => {
      receivedContext = context
      return { message: 'hello' }
    })

    const message = buildCallMessage({
      query: { foo: 'bar' },
      body: { a: 1 },
      user: { id: 'user-1', username: 'alice' },
    })
    const reply = await dispatchCall(routes, message)

    expect(receivedContext).toEqual({
      user: { id: 'user-1', username: 'alice' },
      query: { foo: 'bar' },
      body: { a: 1 },
    })
    expect(reply).toEqual({
      type: 'response',
      requestId: 'req-1',
      status: 200,
      body: { message: 'hello' },
    })
  })

  it('matches the registered method case-insensitively', async () => {
    const { appManager, routes } = createAppManager(() => {})
    appManager.registerRoute('get', '/x', () => 'ok')

    const reply = await dispatchCall(routes, buildCallMessage({ method: 'GET' }))

    expect(reply).toEqual({ type: 'response', requestId: 'req-1', status: 200, body: 'ok' })
  })

  it('replies with APP_BACKEND_ROUTE_NOT_FOUND when no handler matches the method+path', async () => {
    const { routes } = createAppManager(() => {})

    const reply = await dispatchCall(routes, buildCallMessage({ path: '/unregistered' }))

    expect(reply).toEqual({
      type: 'error',
      requestId: 'req-1',
      errorCode: 'APP_BACKEND_ROUTE_NOT_FOUND',
      errorMessage: expect.any(String),
    })
  })

  it('replies with APP_BACKEND_HANDLER_ERROR without leaking the thrown error message when a handler throws', async () => {
    const { appManager, routes } = createAppManager(() => {})
    appManager.registerRoute('GET', '/x', () => {
      throw new Error('some sensitive internal detail')
    })

    const reply = await dispatchCall(routes, buildCallMessage())

    expect(reply).toEqual({
      type: 'error',
      requestId: 'req-1',
      errorCode: 'APP_BACKEND_HANDLER_ERROR',
      errorMessage: expect.any(String),
    })
    expect((reply as { errorMessage: string }).errorMessage).not.toContain(
      'some sensitive internal detail',
    )
  })
})

describe('appManager.storage', () => {
  it('sends a storage-request describing a store operation', () => {
    const { manager, sent } = createRecordingManager()

    void manager.appManager.storage.store('notes', { text: 'hello' })

    expect(lastStorageRequest(sent)).toMatchObject({
      type: 'storage-request',
      operation: 'store',
      collectionName: 'notes',
      record: { text: 'hello' },
    })
  })

  it('sends a storage-request describing a query operation', () => {
    const { manager, sent } = createRecordingManager()

    void manager.appManager.storage.query('notes', { done: false })

    expect(lastStorageRequest(sent)).toMatchObject({
      operation: 'query',
      collectionName: 'notes',
      filter: { done: false },
    })
  })

  it('sends a storage-request describing a remove operation', () => {
    const { manager, sent } = createRecordingManager()

    void manager.appManager.storage.remove('notes', 'record-1')

    expect(lastStorageRequest(sent)).toMatchObject({
      operation: 'remove',
      collectionName: 'notes',
      id: 'record-1',
    })
  })

  it('never includes an appId in the request — scoping is the Hub’s business', () => {
    const { manager, sent } = createRecordingManager()

    void manager.appManager.storage.query('notes')

    expect(lastStorageRequest(sent)).not.toHaveProperty('appId')
  })

  it('gives every concurrent request its own requestId', () => {
    const { manager, sent } = createRecordingManager()

    void manager.appManager.storage.query('a')
    void manager.appManager.storage.query('b')

    const ids = sent.filter((message) => message.type === 'storage-request').map((m) => m.requestId)
    expect(new Set(ids).size).toBe(2)
  })

  it('resolves the pending call with the result of a matching storage-response', async () => {
    const { manager, sent } = createRecordingManager()

    const pending = manager.appManager.storage.query('notes')
    manager.storageClient.settle({
      type: 'storage-response',
      requestId: lastStorageRequest(sent).requestId,
      result: [{ id: 'record-1', text: 'hello' }],
    })

    await expect(pending).resolves.toEqual([{ id: 'record-1', text: 'hello' }])
  })

  it('rejects with an AppStorageError carrying the code from a storage-error', async () => {
    const { manager, sent } = createRecordingManager()

    const pending = manager.appManager.storage.store('notes', {})
    manager.storageClient.settle({
      type: 'storage-error',
      requestId: lastStorageRequest(sent).requestId,
      errorCode: 'APP_STORAGE_RECORD_NOT_FOUND',
      errorMessage: 'No record with that id exists.',
    })

    await expect(pending).rejects.toMatchObject({
      name: 'AppStorageError',
      errorCode: 'APP_STORAGE_RECORD_NOT_FOUND',
      errorMessage: 'No record with that id exists.',
    })
  })

  it('rejects with the exact shape the SDK’s isAppStorageError guard requires', async () => {
    // The guard lives in @amber-hub/app-sdk and checks instanceof Error + name + two string
    // fields. Pinning the shape here keeps the two packages from drifting apart.
    const { manager, sent } = createRecordingManager()

    const pending = manager.appManager.storage.query('notes')
    manager.storageClient.settle({
      type: 'storage-error',
      requestId: lastStorageRequest(sent).requestId,
      errorCode: 'APP_STORAGE_UNAVAILABLE',
      errorMessage: 'boom',
    })

    const error = await pending.catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).name).toBe('AppStorageError')
    expect(typeof (error as { errorCode: unknown }).errorCode).toBe('string')
    expect(typeof (error as { errorMessage: unknown }).errorMessage).toBe('string')
  })

  it('routes each reply to its own pending call', async () => {
    const { manager, sent } = createRecordingManager()

    const first = manager.appManager.storage.query('a')
    const firstId = lastStorageRequest(sent).requestId
    const second = manager.appManager.storage.query('b')
    const secondId = lastStorageRequest(sent).requestId

    manager.storageClient.settle({ type: 'storage-response', requestId: secondId, result: 'B' })
    manager.storageClient.settle({ type: 'storage-response', requestId: firstId, result: 'A' })

    await expect(first).resolves.toBe('A')
    await expect(second).resolves.toBe('B')
  })

  it('ignores a reply for an unknown requestId', () => {
    const { manager } = createRecordingManager()

    expect(() =>
      manager.storageClient.settle({
        type: 'storage-response',
        requestId: 'never-sent',
        result: null,
      }),
    ).not.toThrow()
  })

  it('rejects every pending call with APP_STORAGE_UNAVAILABLE when the channel closes', async () => {
    const { manager } = createRecordingManager()

    const first = manager.appManager.storage.query('a')
    const second = manager.appManager.storage.query('b')
    manager.storageClient.rejectAllPending()

    await expect(first).rejects.toMatchObject({ errorCode: 'APP_STORAGE_UNAVAILABLE' })
    await expect(second).rejects.toMatchObject({ errorCode: 'APP_STORAGE_UNAVAILABLE' })
  })

  it('does not settle a call twice when a reply arrives after the channel closed', async () => {
    const { manager, sent } = createRecordingManager()

    const pending = manager.appManager.storage.query('a')
    const requestId = lastStorageRequest(sent).requestId
    manager.storageClient.rejectAllPending()
    manager.storageClient.settle({ type: 'storage-response', requestId, result: 'late' })

    await expect(pending).rejects.toMatchObject({ errorCode: 'APP_STORAGE_UNAVAILABLE' })
  })
})

function buildToolCallMessage(overrides: Partial<ToolCallRequestMessage> = {}): ToolCallRequestMessage {
  return {
    type: 'tool-call',
    requestId: 'req-1',
    name: 'echo',
    input: { text: 'hi' },
    user: { id: 'user-1', username: 'alice' },
    ...overrides,
  }
}

describe('appManager.registerTool / dispatchToolCall / toDeclarations', () => {
  it('stores a registered tool under its name and invokes it with the ToolContext', async () => {
    const { appManager, tools } = createAppManager(() => {})
    let receivedContext: unknown
    appManager.registerTool({
      name: 'echo',
      description: 'Echoes text.',
      inputSchema: { type: 'object' },
      handler: (context) => {
        receivedContext = context
        return { echoed: (context.input as { text: string }).text }
      },
    })

    const reply = await dispatchToolCall(tools, buildToolCallMessage())

    expect(receivedContext).toEqual({
      user: { id: 'user-1', username: 'alice' },
      input: { text: 'hi' },
    })
    expect(reply).toEqual({
      type: 'response',
      requestId: 'req-1',
      status: 200,
      body: { echoed: 'hi' },
    })
  })

  it('replies with APP_TOOL_NOT_FOUND when no tool is registered under the name', async () => {
    const { tools } = createAppManager(() => {})

    const reply = await dispatchToolCall(tools, buildToolCallMessage({ name: 'missing' }))

    expect(reply).toEqual({
      type: 'error',
      requestId: 'req-1',
      errorCode: 'APP_TOOL_NOT_FOUND',
      errorMessage: expect.any(String),
    })
  })

  it('replies with APP_BACKEND_HANDLER_ERROR without leaking the thrown message when a tool throws', async () => {
    const { appManager, tools } = createAppManager(() => {})
    appManager.registerTool({
      name: 'boom',
      description: 'Throws.',
      inputSchema: { type: 'object' },
      handler: () => {
        throw new Error('sensitive tool detail')
      },
    })

    const reply = await dispatchToolCall(tools, buildToolCallMessage({ name: 'boom' }))

    expect(reply).toMatchObject({
      type: 'error',
      requestId: 'req-1',
      errorCode: 'APP_BACKEND_HANDLER_ERROR',
    })
    expect((reply as { errorMessage: string }).errorMessage).not.toContain('sensitive tool detail')
  })

  it('strips the handler and keeps declaration fields via toDeclarations', () => {
    const { appManager, tools } = createAppManager(() => {})
    appManager.registerTool({
      name: 'with-hints',
      description: 'Has annotations.',
      inputSchema: { type: 'object', additionalProperties: false },
      annotations: { readOnlyHint: true },
      handler: () => ({}),
    })
    appManager.registerTool({
      name: 'plain',
      description: 'No annotations.',
      inputSchema: { type: 'object' },
      handler: () => ({}),
    })

    const declarations = toDeclarations(tools)

    expect(declarations).toEqual([
      {
        name: 'with-hints',
        description: 'Has annotations.',
        inputSchema: { type: 'object', additionalProperties: false },
        annotations: { readOnlyHint: true },
      },
      {
        name: 'plain',
        description: 'No annotations.',
        inputSchema: { type: 'object' },
      },
    ])
    expect(declarations[1]).not.toHaveProperty('annotations')
    expect(declarations[0]).not.toHaveProperty('handler')
  })
})
