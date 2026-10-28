export interface RouteContext {
  user: { id: string; username: string }
  query: Record<string, string>
  body: unknown
}

export type AppRouteHandler<TResult = unknown> = (
  context: RouteContext,
) => TResult | Promise<TResult>

/** Any value that survives the JSON transport between an app and the Hub. */
export type StorableValue =
  | string
  | number
  | boolean
  | null
  | StorableValue[]
  | { [key: string]: StorableValue }

/** A record as an app hands it to store(). An `id` means "replace that record". */
export interface StorableRecord {
  id?: string
  [field: string]: StorableValue | undefined
}

/** A record as the Hub returns it: the app's fields plus the Hub-assigned id. */
export interface StoredRecord {
  id: string
  [field: string]: StorableValue | undefined
}

/** Top-level equality filter. The key `id` matches the Hub-assigned id. */
export type StorageFilter = Record<string, string | number | boolean | null>

export type AppStorageErrorCode =
  | 'APP_STORAGE_INVALID_COLLECTION_NAME'
  | 'APP_STORAGE_INVALID_RECORD'
  | 'APP_STORAGE_INVALID_FILTER'
  | 'APP_STORAGE_RECORD_NOT_FOUND'
  | 'APP_STORAGE_UNAVAILABLE'

/** Rejection value of every failed storage call. */
export interface AppStorageError extends Error {
  name: 'AppStorageError'
  errorCode: AppStorageErrorCode
  errorMessage: string
}

export interface AppStorage {
  /** Without an id: inserts and returns the record incl. its new id. With an id: replaces that record. */
  store(collectionName: string, record: StorableRecord): Promise<StoredRecord>
  /** Equality-matches top-level fields; an omitted or empty filter returns every record. */
  query(collectionName: string, filter?: StorageFilter): Promise<StoredRecord[]>
  /** Deletes the record with this id; rejects if it does not exist. */
  remove(collectionName: string, id: string): Promise<void>
}

/** JSON Schema 2020-12 for a tool's arguments. Always an object at the root. */
export interface ToolInputSchema {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
  [keyword: string]: unknown
}

/** Optional behaviour hints forwarded to the LLM client unchanged. */
export interface ToolAnnotations {
  readOnlyHint?: boolean
  destructiveHint?: boolean
}

export interface ToolContext<TInput = unknown> {
  user: { id: string; username: string }
  input: TInput
}

export type AppToolHandler<TInput = unknown, TResult = unknown> = (
  context: ToolContext<TInput>,
) => TResult | Promise<TResult>

export interface ToolDefinition<TInput = unknown, TResult = unknown> {
  name: string
  description: string
  inputSchema: ToolInputSchema
  annotations?: ToolAnnotations
  handler: AppToolHandler<TInput, TResult>
}

export interface AppManager {
  registerRoute<TResult = unknown>(
    method: string,
    path: string,
    handler: AppRouteHandler<TResult>,
  ): void
  registerTool<TInput = unknown, TResult = unknown>(tool: ToolDefinition<TInput, TResult>): void
  storage: AppStorage
}

export type AppBackendInit = (appManager: AppManager) => void | Promise<void>

/**
 * Narrows a caught value to an AppStorageError so `errorCode` can be branched on directly.
 * Any `errorCode` string is accepted, not only the codes this SDK version lists, so an app built
 * against an older SDK still handles storage errors from a newer Hub correctly.
 */
export function isAppStorageError(error: unknown): error is AppStorageError {
  return (
    error instanceof Error &&
    error.name === 'AppStorageError' &&
    typeof (error as Partial<AppStorageError>).errorCode === 'string' &&
    typeof (error as Partial<AppStorageError>).errorMessage === 'string'
  )
}
