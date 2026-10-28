import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type {
  CallRequestMessage,
  CallResponseMessage,
  CallErrorMessage,
  HubToRunnerMessage,
  ReadyMessage,
  RunnerErrorMessage,
  RunnerToHubMessage,
  StorageErrorMessage,
  StorageRequestMessage,
  StorageResponseMessage,
  ToolCallRequestMessage,
  ToolDeclaration,
} from './ipcProtocol'

export interface RouteContext {
  user: { id: string; username: string }
  query: Record<string, string>
  body: unknown
}

export type RouteHandler = (context: RouteContext) => unknown | Promise<unknown>

export interface ToolContext {
  user: { id: string; username: string }
  input: unknown
}

export type ToolHandler = (context: ToolContext) => unknown | Promise<unknown>

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  handler: ToolHandler
}

export interface AppStorage {
  store(collectionName: string, record: Record<string, unknown>): Promise<unknown>
  query(collectionName: string, filter?: Record<string, unknown>): Promise<unknown>
  remove(collectionName: string, id: string): Promise<void>
}

export interface AppManager {
  registerRoute(method: string, path: string, handler: RouteHandler): void
  registerTool(tool: ToolDefinition): void
  storage: AppStorage
}

export interface StorageClient {
  storage: AppStorage
  /** Applies a reply from the Hub to its pending call; replies for unknown ids are ignored. */
  settle(message: StorageResponseMessage | StorageErrorMessage): void
  /** Fails every in-flight call — used when the IPC channel goes away. */
  rejectAllPending(): void
}

interface PendingStorageCall {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

class AppStorageError extends Error {
  readonly errorCode: string
  readonly errorMessage: string

  constructor(errorCode: string, errorMessage: string) {
    super(errorMessage)
    this.name = 'AppStorageError'
    this.errorCode = errorCode
    this.errorMessage = errorMessage
  }
}

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`
}

export function createStorageClient(send: (message: RunnerToHubMessage) => void): StorageClient {
  const pending = new Map<string, PendingStorageCall>()

  function request(payload: Omit<StorageRequestMessage, 'type' | 'requestId'>): Promise<unknown> {
    const requestId = randomUUID()
    return new Promise<unknown>((resolve, reject) => {
      pending.set(requestId, { resolve, reject })
      send({ type: 'storage-request', requestId, ...payload })
    })
  }

  return {
    storage: {
      store: (collectionName, record) => request({ operation: 'store', collectionName, record }),
      query: (collectionName, filter) => request({ operation: 'query', collectionName, filter }),
      remove: async (collectionName, id) => {
        await request({ operation: 'remove', collectionName, id })
      },
    },
    settle(message) {
      const call = pending.get(message.requestId)
      if (!call) {
        return
      }
      pending.delete(message.requestId)
      if (message.type === 'storage-response') {
        call.resolve(message.result)
      } else {
        call.reject(new AppStorageError(message.errorCode, message.errorMessage))
      }
    },
    rejectAllPending() {
      const calls = Array.from(pending.values())
      pending.clear()
      for (const call of calls) {
        call.reject(
          new AppStorageError(
            'APP_STORAGE_UNAVAILABLE',
            'The connection to the Hub was lost before the storage operation completed.',
          ),
        )
      }
    },
  }
}

export function createAppManager(send: (message: RunnerToHubMessage) => void): {
  appManager: AppManager
  routes: Map<string, RouteHandler>
  tools: Map<string, ToolDefinition>
  storageClient: StorageClient
} {
  const routes = new Map<string, RouteHandler>()
  const tools = new Map<string, ToolDefinition>()
  const storageClient = createStorageClient(send)
  const appManager: AppManager = {
    registerRoute(method, path, handler) {
      routes.set(routeKey(method, path), handler)
    },
    registerTool(tool) {
      tools.set(tool.name, tool)
    },
    storage: storageClient.storage,
  }
  return { appManager, routes, tools, storageClient }
}

export function toDeclarations(tools: Map<string, ToolDefinition>): ToolDeclaration[] {
  return Array.from(tools.values()).map((tool) => {
    const declaration: ToolDeclaration = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }
    if (tool.annotations !== undefined) {
      declaration.annotations = tool.annotations
    }
    return declaration
  })
}

export async function dispatchToolCall(
  tools: Map<string, ToolDefinition>,
  message: ToolCallRequestMessage,
): Promise<CallResponseMessage | CallErrorMessage> {
  const tool = tools.get(message.name)
  if (!tool) {
    return {
      type: 'error',
      requestId: message.requestId,
      errorCode: 'APP_TOOL_NOT_FOUND',
      errorMessage: 'No tool with this name is registered.',
    }
  }

  try {
    const body = await tool.handler({ user: message.user, input: message.input })
    return { type: 'response', requestId: message.requestId, status: 200, body }
  } catch {
    return {
      type: 'error',
      requestId: message.requestId,
      errorCode: 'APP_BACKEND_HANDLER_ERROR',
      errorMessage: 'The app backend tool threw an error.',
    }
  }
}

export async function dispatchCall(
  routes: Map<string, RouteHandler>,
  message: CallRequestMessage,
): Promise<CallResponseMessage | CallErrorMessage> {
  const handler = routes.get(routeKey(message.method, message.path))
  if (!handler) {
    return {
      type: 'error',
      requestId: message.requestId,
      errorCode: 'APP_BACKEND_ROUTE_NOT_FOUND',
      errorMessage: 'No matching route was registered for this call.',
    }
  }

  try {
    const body = await handler({ user: message.user, query: message.query, body: message.body })
    return { type: 'response', requestId: message.requestId, status: 200, body }
  } catch {
    return {
      type: 'error',
      requestId: message.requestId,
      errorCode: 'APP_BACKEND_HANDLER_ERROR',
      errorMessage: 'The app backend handler threw an error.',
    }
  }
}

async function main(): Promise<void> {
  const entryPath = process.argv[2]
  if (!entryPath) {
    throw new Error('appBackendRunner requires the app backend entry path as argv[2]')
  }

  const send = (message: RunnerToHubMessage): void => {
    process.send?.(message)
  }

  const { appManager, routes, tools, storageClient } = createAppManager(send)

  // Storage replies must be routed from the very first tick: init() itself may store data.
  process.on('message', (message: HubToRunnerMessage) => {
    if (message.type === 'storage-response' || message.type === 'storage-error') {
      storageClient.settle(message)
      return
    }
    if (message.type === 'tool-call') {
      dispatchToolCall(tools, message).then(send)
      return
    }
    dispatchCall(routes, message).then(send)
  })
  process.on('disconnect', () => storageClient.rejectAllPending())

  try {
    const entryModule = await import(entryPath)
    await entryModule.default(appManager)
  } catch (error) {
    const runnerError: RunnerErrorMessage = {
      type: 'runner-error',
      errorMessage: error instanceof Error ? error.message : 'Failed to initialize app backend',
    }
    send(runnerError)
    return
  }

  const ready: ReadyMessage = { type: 'ready', tools: toDeclarations(tools) }
  send(ready)
}

const isMainModule = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
