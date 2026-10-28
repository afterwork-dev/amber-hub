import { fork, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from '../../errors/AppError'
import { getAppBackendCallTimeoutMs, getAppBackendStartTimeoutMs, getAppsStoragePath } from '../../config/env'
import { getApp, listApps } from '../apps/appListService'
import { executeStorageRequest } from '../appStorage/appStorageService'
import type {
  CallRequestMessage,
  HubToRunnerMessage,
  RunnerToHubMessage,
  StorageErrorMessage,
  StorageRequestMessage,
  StorageResponseMessage,
  ToolCallRequestMessage,
} from './ipcProtocol'
import { validateToolDeclarations, type PublishedTool } from '../mcp/toolDeclarationValidator'

const RUNNER_PATH = join(dirname(fileURLToPath(import.meta.url)), 'appBackendRunner.ts')

type BackendStatus = 'stopped' | 'starting' | 'running' | 'crashed'

interface PendingCall {
  resolve: (result: { status: number; body: unknown }) => void
  reject: (error: AppError) => void
  timer: NodeJS.Timeout
}

interface AppBackendRecord {
  appId: string
  entryPath: string
  status: BackendStatus
  process?: ChildProcess
  hasUsedRestart: boolean
  pendingCalls: Map<string, PendingCall>
  tools: PublishedTool[]
}

export interface CallContext {
  method: string
  path: string
  query: Record<string, string>
  body: unknown
  user: { id: string; username: string }
}

const records = new Map<string, AppBackendRecord>()

function getRecord(appId: string): AppBackendRecord | undefined {
  return records.get(appId)
}

function rejectAllPendingCalls(record: AppBackendRecord, error: AppError): void {
  const pending = Array.from(record.pendingCalls.values())
  record.pendingCalls.clear()
  for (const call of pending) {
    clearTimeout(call.timer)
    call.reject(error)
  }
}

function mapChildErrorCode(errorCode: string): AppError {
  if (errorCode === 'APP_BACKEND_ROUTE_NOT_FOUND') {
    return new AppError(
      'APP_BACKEND_ROUTE_NOT_FOUND',
      'No matching route was registered for this call.',
      404,
    )
  }
  if (errorCode === 'APP_TOOL_NOT_FOUND') {
    return new AppError('APP_TOOL_NOT_FOUND', 'The app backend has no tool with this name.', 404)
  }
  return new AppError(
    'APP_BACKEND_HANDLER_ERROR',
    'The app backend handler failed to process this call.',
    502,
  )
}

/**
 * Executes one app storage request. `appId` comes from the Hub's record of the child process the
 * request arrived on — never from the message — which is what keeps apps out of each other's data.
 */
export async function buildStorageReply(
  appId: string,
  message: StorageRequestMessage,
): Promise<StorageResponseMessage | StorageErrorMessage> {
  try {
    const result = await executeStorageRequest(appId, message)
    return { type: 'storage-response', requestId: message.requestId, result }
  } catch (error) {
    if (error instanceof AppError) {
      return {
        type: 'storage-error',
        requestId: message.requestId,
        errorCode: error.errorCode,
        errorMessage: error.message,
      }
    }
    console.error(`Storage request of app "${appId}" failed unexpectedly:`, error)
    return {
      type: 'storage-error',
      requestId: message.requestId,
      errorCode: 'APP_STORAGE_UNAVAILABLE',
      errorMessage: 'App storage is currently unavailable.',
    }
  }
}

/** Sends a message to a child, dropping it if the child has already gone away. */
export function sendToChild(child: ChildProcess | undefined, message: HubToRunnerMessage): boolean {
  if (!child?.connected) {
    return false
  }
  child.send(message)
  return true
}

function handleChildMessage(record: AppBackendRecord, message: RunnerToHubMessage): void {
  if (message.type === 'storage-request') {
    void buildStorageReply(record.appId, message).then((reply) => sendToChild(record.process, reply))
    return
  }
  if (message.type === 'response' || message.type === 'error') {
    const pending = record.pendingCalls.get(message.requestId)
    if (!pending) {
      return
    }
    clearTimeout(pending.timer)
    record.pendingCalls.delete(message.requestId)
    if (message.type === 'response') {
      pending.resolve({ status: message.status, body: message.body })
    } else {
      pending.reject(mapChildErrorCode(message.errorCode))
    }
  }
}

function startProcess(record: AppBackendRecord): Promise<void> {
  record.status = 'starting'
  const child = fork(RUNNER_PATH, [record.entryPath], { execArgv: ['--import', 'tsx'] })
  record.process = child

  return new Promise<void>((resolvePromise, rejectPromise) => {
    let becameReady = false

    const startTimer = setTimeout(() => {
      if (becameReady) {
        return
      }
      becameReady = true
      record.status = 'crashed'
      record.process = undefined
      child.kill()
      rejectPromise(
        new AppError('APP_BACKEND_START_FAILED', 'The app backend did not become ready in time.', 502),
      )
    }, getAppBackendStartTimeoutMs())

    child.on('message', (message: RunnerToHubMessage) => {
      if (message.type === 'ready') {
        if (becameReady) {
          return
        }
        becameReady = true
        clearTimeout(startTimer)
        record.tools = validateToolDeclarations(record.appId, message.tools ?? [])
        record.status = 'running'
        resolvePromise()
        return
      }
      if (message.type === 'runner-error') {
        if (becameReady) {
          return
        }
        becameReady = true
        clearTimeout(startTimer)
        record.status = 'crashed'
        rejectPromise(new AppError('APP_BACKEND_START_FAILED', 'The app backend failed to initialize.', 502))
        return
      }
      handleChildMessage(record, message)
    })

    child.on('error', (error) => {
      if (becameReady) {
        return
      }
      becameReady = true
      clearTimeout(startTimer)
      record.status = 'crashed'
      rejectPromise(new AppError('APP_BACKEND_START_FAILED', error.message, 502))
    })

    child.on('exit', () => {
      const wasRunning = record.status === 'running'
      record.process = undefined
      record.tools = []

      if (!becameReady) {
        becameReady = true
        clearTimeout(startTimer)
        record.status = 'crashed'
        rejectPromise(
          new AppError('APP_BACKEND_START_FAILED', 'The app backend exited before becoming ready.', 502),
        )
        return
      }

      if (!wasRunning) {
        // Already handled by the start-timeout/runner-error branch above (e.g. we killed it
        // ourselves after it failed to start) — nothing further to do.
        return
      }

      rejectAllPendingCalls(
        record,
        new AppError('APP_BACKEND_CRASHED', 'The app backend crashed unexpectedly.', 502),
      )

      if (!record.hasUsedRestart) {
        record.hasUsedRestart = true
        void startProcess(record).catch(() => undefined)
      } else {
        record.status = 'crashed'
      }
    })
  })
}

function sendRequest(
  record: AppBackendRecord,
  message: CallRequestMessage | ToolCallRequestMessage,
): Promise<{ status: number; body: unknown }> {
  if (!record.process) {
    throw new AppError('APP_BACKEND_CRASHED', 'The app backend has crashed and is no longer available.', 502)
  }

  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      record.pendingCalls.delete(message.requestId)
      rejectPromise(new AppError('APP_BACKEND_TIMEOUT', "The app's backend did not respond in time.", 504))
    }, getAppBackendCallTimeoutMs())

    record.pendingCalls.set(message.requestId, { resolve: resolvePromise, reject: rejectPromise, timer })
    record.process?.send(message)
  })
}

async function requireRunningRecord(appId: string): Promise<AppBackendRecord> {
  const record = getRecord(appId)
  if (!record) {
    const app = await getApp(appId)
    if (!app) {
      throw new AppError('APP_NOT_FOUND', `App "${appId}" was not found.`, 404)
    }
    if (!app.backend) {
      throw new AppError('APP_BACKEND_NOT_DECLARED', `App "${appId}" has no declared backend.`, 404)
    }
    throw new AppError('APP_BACKEND_CRASHED', 'The app backend is not running.', 502)
  }
  if (record.status !== 'running') {
    throw new AppError('APP_BACKEND_CRASHED', 'The app backend is not running.', 502)
  }
  return record
}

export async function forwardCall(
  appId: string,
  callContext: CallContext,
): Promise<{ status: number; body: unknown }> {
  const record = await requireRunningRecord(appId)
  return sendRequest(record, { type: 'call', requestId: randomUUID(), ...callContext })
}

export function listPublishedTools(): PublishedTool[] {
  return Array.from(records.values())
    .filter((record) => record.status === 'running')
    .flatMap((record) => record.tools)
    .sort((a, b) => a.presentedName.localeCompare(b.presentedName))
}

export async function callTool(
  appId: string,
  name: string,
  input: unknown,
  user: { id: string; username: string },
): Promise<unknown> {
  const record = await requireRunningRecord(appId)
  const message: ToolCallRequestMessage = { type: 'tool-call', requestId: randomUUID(), name, input, user }
  const result = await sendRequest(record, message)
  return result.body
}

export async function startBackendIfDeclared(appId: string): Promise<void> {
  try {
    const app = await getApp(appId)
    if (!app) {
      console.error(`Failed to start app backend "${appId}": app was not found.`)
      return
    }
    if (!app.backend) {
      return
    }

    let record = getRecord(appId)
    if (!record) {
      record = {
        appId,
        entryPath: resolve(getAppsStoragePath(), appId, app.backend.entry),
        status: 'stopped',
        hasUsedRestart: false,
        pendingCalls: new Map(),
        tools: [],
      }
      records.set(appId, record)
    }

    if (record.status !== 'stopped') {
      return
    }
    await startProcess(record)
  } catch (error) {
    console.error(`Failed to start app backend "${appId}":`, error)
  }
}

export async function startAppBackends(): Promise<void> {
  const apps = await listApps()
  await Promise.all(apps.map((app) => startBackendIfDeclared(app.id)))
}

export function resetAppBackendsForTests(): void {
  for (const record of records.values()) {
    record.process?.kill()
  }
  records.clear()
}

export function getBackendStatusForTests(appId: string): { status: BackendStatus; pid?: number } | undefined {
  const record = getRecord(appId)
  if (!record) {
    return undefined
  }
  return { status: record.status, pid: record.process?.pid }
}
