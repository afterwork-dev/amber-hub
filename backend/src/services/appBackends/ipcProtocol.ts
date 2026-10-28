export interface CallRequestMessage {
  type: 'call'
  requestId: string
  method: string
  path: string
  query: Record<string, string>
  body: unknown
  user: { id: string; username: string }
}

export interface CallResponseMessage {
  type: 'response'
  requestId: string
  status: number
  body: unknown
}

export interface CallErrorMessage {
  type: 'error'
  requestId: string
  errorCode: string
  errorMessage: string
}

/**
 * A storage operation an app backend asked for. It deliberately carries no appId: the Hub resolves
 * the calling app from the child process the message arrived on, so no payload can widen its scope.
 */
export interface StorageRequestMessage {
  type: 'storage-request'
  requestId: string
  operation: 'store' | 'query' | 'remove'
  collectionName: string
  record?: unknown
  filter?: unknown
  id?: unknown
}

export interface StorageResponseMessage {
  type: 'storage-response'
  requestId: string
  result: unknown
}

export interface StorageErrorMessage {
  type: 'storage-error'
  requestId: string
  errorCode: string
  errorMessage: string
}

/** A tool as an app declares it, minus the handler, which stays in the child process. */
export interface ToolDeclaration {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
}

export interface ReadyMessage {
  type: 'ready'
  tools: ToolDeclaration[]
}

export interface ToolCallRequestMessage {
  type: 'tool-call'
  requestId: string
  name: string
  input: unknown
  user: { id: string; username: string }
}

export interface RunnerErrorMessage {
  type: 'runner-error'
  errorMessage: string
}

export type HubToRunnerMessage =
  | CallRequestMessage
  | ToolCallRequestMessage
  | StorageResponseMessage
  | StorageErrorMessage

export type RunnerToHubMessage =
  | ReadyMessage
  | CallResponseMessage
  | CallErrorMessage
  | RunnerErrorMessage
  | StorageRequestMessage
