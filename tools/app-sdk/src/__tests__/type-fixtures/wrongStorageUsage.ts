import type { AppBackendInit, StoredRecord } from '../../backend'

const init: AppBackendInit = async (appManager) => {
  // @ts-expect-error - store requires a collection name as well as the record
  await appManager.storage.store({ text: 'hello' })

  // @ts-expect-error - a record must be an object, not a bare primitive
  await appManager.storage.store('notes', 'hello')

  // @ts-expect-error - filter values are primitives; nested objects are not matchable
  await appManager.storage.query('notes', { meta: { nested: true } })

  // @ts-expect-error - remove takes the record id, not a filter object
  await appManager.storage.remove('notes', { id: 'record-1' })

  // @ts-expect-error - the collection name is a string, not an object
  await appManager.storage.query({ collection: 'notes' })

  const stored: StoredRecord = await appManager.storage.store('notes', { text: 'hello' })

  // @ts-expect-error - id is assigned by the Hub and is always a string
  const id: number = stored.id
  void id

  // A record's own fields are storable values, so this must NOT error.
  const notes: StoredRecord[] = await appManager.storage.query('notes', { done: false })
  void notes
}

void init
