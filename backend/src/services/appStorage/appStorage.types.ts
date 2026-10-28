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

export type StorageOperation = 'store' | 'query' | 'remove'

/** A storage request as it arrives from an app backend — every field is untrusted input. */
export interface StorageRequest {
  operation: StorageOperation
  collectionName: unknown
  record?: unknown
  filter?: unknown
  id?: unknown
}

export type StorageResult = StoredRecord | StoredRecord[] | null
