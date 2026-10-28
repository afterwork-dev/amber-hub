import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { AppError } from '../../../errors/AppError'
import {
  assertValidCollectionName,
  assertValidFilter,
  assertValidRecord,
  executeStorageRequest,
  toPhysicalCollectionName,
} from '../appStorageService'
import type { StoredRecord } from '../appStorage.types'

let mongod: MongoMemoryServer
let connectMongo: (typeof import('../../../db/mongoClient'))['connectMongo']
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  const mongoClient = await import('../../../db/mongoClient')
  connectMongo = mongoClient.connectMongo
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb

  await connectMongo()
}, 60_000)

afterAll(async () => {
  await disconnectMongo()
  await mongod.stop()
})

function expectAppError(action: () => unknown, errorCode: string): void {
  try {
    action()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).errorCode).toBe(errorCode)
    return
  }
  throw new Error(`expected an AppError with code ${errorCode}, but nothing was thrown`)
}

async function expectRejectedWith(action: Promise<unknown>, errorCode: string): Promise<void> {
  await expect(action).rejects.toMatchObject({ name: 'AppError', errorCode })
}

async function collectionNames(): Promise<string[]> {
  return (await getDb().listCollections().toArray()).map((info) => info.name)
}

describe('assertValidCollectionName', () => {
  it.each(['notes', 'a', 'my-notes', 'a1', 'notes-2024', 'a'.repeat(40)])(
    'accepts the valid name %s',
    (collectionName) => {
      expect(() => assertValidCollectionName(collectionName)).not.toThrow()
    },
  )

  it.each([
    ['empty', ''],
    ['too long', 'a'.repeat(41)],
    ['leading digit', '1notes'],
    ['leading hyphen', '-notes'],
    ['uppercase', 'Notes'],
    ['underscore', 'my_notes'],
    ['dot', 'my.notes'],
    ['dollar', 'my$notes'],
    ['forward slash', 'my/notes'],
    ['parent traversal', '../notes'],
    ['null byte', 'notes\0'],
    ['whitespace', 'my notes'],
    ['unicode', 'notizen-ä'],
    ['system prefix', 'system.indexes'],
  ])('rejects %s', (_label, collectionName) => {
    expectAppError(
      () => assertValidCollectionName(collectionName),
      'APP_STORAGE_INVALID_COLLECTION_NAME',
    )
  })

  it.each([[undefined], [null], [42], [{}], [['notes']]])(
    'rejects the non-string name %s',
    (collectionName) => {
      expectAppError(
        () => assertValidCollectionName(collectionName),
        'APP_STORAGE_INVALID_COLLECTION_NAME',
      )
    },
  )

  it('names the offending value in the error message for debugging', () => {
    try {
      assertValidCollectionName('Notes')
    } catch (error) {
      expect((error as AppError).message).toContain('Notes')
      expect((error as AppError).statusCode).toBe(400)
    }
  })
})

describe('assertValidRecord', () => {
  it('accepts a flat record of JSON-safe values', () => {
    expect(() =>
      assertValidRecord({ text: 'hello', done: false, count: 3, tag: null }),
    ).not.toThrow()
  })

  it('accepts nested objects and arrays of storable values', () => {
    expect(() =>
      assertValidRecord({ items: [1, 'two', { three: true }], meta: { nested: { deep: null } } }),
    ).not.toThrow()
  })

  it('accepts a record carrying a string id (replace)', () => {
    expect(() => assertValidRecord({ id: '507f1f77bcf86cd799439011', text: 'x' })).not.toThrow()
  })

  it.each([
    ['an array', [1, 2, 3]],
    ['a string', 'not-a-record'],
    ['a number', 42],
    ['null', null],
    ['undefined', undefined],
    ['a Date', new Date()],
  ])('rejects %s as a top-level record', (_label, record) => {
    expectAppError(() => assertValidRecord(record), 'APP_STORAGE_INVALID_RECORD')
  })

  it.each([
    ['the reserved _id key', { _id: 'abc' }],
    ['a key starting with $', { $set: 'x' }],
    ['a key containing a dot', { 'a.b': 'x' }],
    ['a nested key starting with $', { meta: { $where: 'x' } }],
    ['a nested key containing a dot', { meta: { 'a.b': 'x' } }],
  ])('rejects %s', (_label, record) => {
    expectAppError(() => assertValidRecord(record), 'APP_STORAGE_INVALID_RECORD')
  })

  it.each([
    ['a function value', { fn: () => 'x' }],
    ['a Date value', { when: new Date() }],
    ['a Map value', { map: new Map() }],
    ['a bigint value', { big: BigInt(1) }],
    ['a symbol value', { sym: Symbol('x') }],
    ['NaN', { n: Number.NaN }],
    ['Infinity', { n: Number.POSITIVE_INFINITY }],
    ['a non-storable value inside an array', { items: [new Date()] }],
  ])('rejects %s as non-JSON-serializable', (_label, record) => {
    expectAppError(() => assertValidRecord(record), 'APP_STORAGE_INVALID_RECORD')
  })

  it('rejects a non-string id', () => {
    expectAppError(() => assertValidRecord({ id: 42 }), 'APP_STORAGE_INVALID_RECORD')
  })

  it('rejects a circular structure instead of hanging', () => {
    const record: Record<string, unknown> = { name: 'loop' }
    record.self = record

    expectAppError(() => assertValidRecord(record), 'APP_STORAGE_INVALID_RECORD')
  })
})

describe('assertValidFilter', () => {
  it.each([[undefined], [{}], [{ done: false }], [{ text: 'x', count: 2, tag: null }]])(
    'accepts the valid filter %s',
    (filter) => {
      expect(() => assertValidFilter(filter)).not.toThrow()
    },
  )

  it('accepts a filter on the Hub-assigned id', () => {
    expect(() => assertValidFilter({ id: '507f1f77bcf86cd799439011' })).not.toThrow()
  })

  it.each([
    ['an array', [1]],
    ['a string', 'done'],
    ['null', null],
  ])('rejects %s as a top-level filter', (_label, filter) => {
    expectAppError(() => assertValidFilter(filter), 'APP_STORAGE_INVALID_FILTER')
  })

  it.each([
    ['an object value', { meta: { nested: true } }],
    ['an array value', { items: [1, 2] }],
    ['a Date value', { when: new Date() }],
    ['NaN', { n: Number.NaN }],
  ])('rejects the non-primitive value %s', (_label, filter) => {
    expectAppError(() => assertValidFilter(filter), 'APP_STORAGE_INVALID_FILTER')
  })

  it.each([
    ['a key starting with $', { $where: 'x' }],
    ['a Mongo operator value key', { $ne: null }],
    ['a key containing a dot', { 'a.b': 'x' }],
    ['the reserved _id key', { _id: 'abc' }],
  ])('rejects %s', (_label, filter) => {
    expectAppError(() => assertValidFilter(filter), 'APP_STORAGE_INVALID_FILTER')
  })
})

describe('toPhysicalCollectionName', () => {
  it('derives the documented app_{appId}_{collectionName} schema', () => {
    expect(toPhysicalCollectionName('echo-app', 'notes')).toBe('app_echo-app_notes')
  })

  it('keeps two apps using the same logical name on separate physical collections', () => {
    expect(toPhysicalCollectionName('app-a', 'items')).not.toBe(
      toPhysicalCollectionName('app-b', 'items'),
    )
  })

  it('parses back unambiguously because app ids never contain underscores', () => {
    const physical = toPhysicalCollectionName('my-app', 'my-notes')
    const withoutPrefix = physical.slice('app_'.length)
    const separator = withoutPrefix.indexOf('_')

    expect(withoutPrefix.slice(0, separator)).toBe('my-app')
    expect(withoutPrefix.slice(separator + 1)).toBe('my-notes')
  })
})

describe('executeStorageRequest: store', () => {
  it('inserts a record without an id and returns it with the Hub-assigned id', async () => {
    const stored = (await executeStorageRequest('store-app', {
      operation: 'store',
      collectionName: 'notes',
      record: { text: 'hello', done: false },
    })) as StoredRecord

    expect(stored.id).toBeTruthy()
    expect(stored.text).toBe('hello')
    expect(await collectionNames()).toContain('app_store-app_notes')
  })

  it('replaces the record when a known id is given', async () => {
    const stored = (await executeStorageRequest('store-app', {
      operation: 'store',
      collectionName: 'notes',
      record: { text: 'before' },
    })) as StoredRecord

    const replaced = (await executeStorageRequest('store-app', {
      operation: 'store',
      collectionName: 'notes',
      record: { id: stored.id, text: 'after' },
    })) as StoredRecord

    expect(replaced.id).toBe(stored.id)
    const found = (await executeStorageRequest('store-app', {
      operation: 'query',
      collectionName: 'notes',
      filter: { id: stored.id },
    })) as StoredRecord[]
    expect(found[0]?.text).toBe('after')
  })

  it('rejects an unknown id with APP_STORAGE_RECORD_NOT_FOUND and inserts nothing', async () => {
    const before = (await executeStorageRequest('miss-app', {
      operation: 'query',
      collectionName: 'notes',
    })) as StoredRecord[]

    await expectRejectedWith(
      executeStorageRequest('miss-app', {
        operation: 'store',
        collectionName: 'notes',
        record: { id: '507f1f77bcf86cd799439011', text: 'ghost' },
      }),
      'APP_STORAGE_RECORD_NOT_FOUND',
    )

    const after = (await executeStorageRequest('miss-app', {
      operation: 'query',
      collectionName: 'notes',
    })) as StoredRecord[]
    expect(after).toHaveLength(before.length)
  })

  it('rejects an invalid record before touching the database', async () => {
    await expectRejectedWith(
      executeStorageRequest('reject-app', {
        operation: 'store',
        collectionName: 'notes',
        record: { $set: 'nope' },
      }),
      'APP_STORAGE_INVALID_RECORD',
    )

    expect(await collectionNames()).not.toContain('app_reject-app_notes')
  })
})

describe('executeStorageRequest: query', () => {
  it('returns an empty array for a collection that was never written to', async () => {
    const found = await executeStorageRequest('query-app', {
      operation: 'query',
      collectionName: 'never-written',
    })

    expect(found).toEqual([])
    expect(await collectionNames()).not.toContain('app_query-app_never-written')
  })

  it('returns only the records matching the filter', async () => {
    for (const record of [{ done: true }, { done: false }, { done: false }]) {
      await executeStorageRequest('query-app', {
        operation: 'store',
        collectionName: 'items',
        record,
      })
    }

    const found = (await executeStorageRequest('query-app', {
      operation: 'query',
      collectionName: 'items',
      filter: { done: false },
    })) as StoredRecord[]

    expect(found).toHaveLength(2)
  })
})

describe('executeStorageRequest: remove', () => {
  it('deletes the record so later reads no longer return it', async () => {
    const stored = (await executeStorageRequest('remove-app', {
      operation: 'store',
      collectionName: 'notes',
      record: { text: 'temporary' },
    })) as StoredRecord

    await executeStorageRequest('remove-app', {
      operation: 'remove',
      collectionName: 'notes',
      id: stored.id,
    })

    expect(
      await executeStorageRequest('remove-app', { operation: 'query', collectionName: 'notes' }),
    ).toEqual([])
  })

  it.each([['507f1f77bcf86cd799439011'], ['not-an-id'], [undefined], [42]])(
    'rejects removing %s with APP_STORAGE_RECORD_NOT_FOUND',
    async (id) => {
      await expectRejectedWith(
        executeStorageRequest('remove-app', {
          operation: 'remove',
          collectionName: 'notes',
          id,
        }),
        'APP_STORAGE_RECORD_NOT_FOUND',
      )
    },
  )
})

describe('executeStorageRequest: collection naming', () => {
  it('creates no collection at all for a rejected collection name', async () => {
    const before = await collectionNames()

    await expectRejectedWith(
      executeStorageRequest('naming-app', {
        operation: 'store',
        collectionName: 'Invalid Name',
        record: { text: 'x' },
      }),
      'APP_STORAGE_INVALID_COLLECTION_NAME',
    )

    expect(await collectionNames()).toEqual(before)
  })

  it.each([
    ['another app’s full physical name', 'app_victim-app_notes'],
    ['an app_ prefix', 'app_victim'],
    ['a parent traversal', '../victim-app/notes'],
    ['a nested traversal', 'notes/../../victim'],
    ['a Mongo system namespace', 'system.indexes'],
    ['a Hub-owned collection', 'users'],
    ['an underscore separator', 'victim-app_notes'],
    ['a null byte', 'notes\0victim'],
    ['a dollar operator', '$victim'],
    ['a dot path', 'notes.victim'],
    ['a database qualifier', 'amberhub.users'],
  ])('never resolves %s outside the calling app', async (_label, collectionName) => {
    const physicalNamesBefore = await collectionNames()

    const outcome = await executeStorageRequest('attacker-app', {
      operation: 'store',
      collectionName,
      record: { intrusion: true },
    }).catch((error: AppError) => error)

    if (outcome instanceof AppError) {
      // Rejected outright: nothing was created anywhere.
      expect(outcome.errorCode).toBe('APP_STORAGE_INVALID_COLLECTION_NAME')
      expect(await collectionNames()).toEqual(physicalNamesBefore)
      return
    }
    // Accepted: it must have landed inside the attacker's own namespace and nowhere else.
    const created = (await collectionNames()).filter((name) => !physicalNamesBefore.includes(name))
    expect(created.every((name) => name.startsWith('app_attacker-app_'))).toBe(true)
  })

  it('cannot reach another app’s records through a crafted collection name', async () => {
    await executeStorageRequest('victim-app', {
      operation: 'store',
      collectionName: 'notes',
      record: { secret: 'victim data' },
    })

    for (const collectionName of ['app_victim-app_notes', 'victim-app_notes', '../victim-app/notes']) {
      const found = await executeStorageRequest('attacker-app', {
        operation: 'query',
        collectionName,
      }).catch(() => [])

      expect(found).toEqual([])
    }
  })

  it('ignores an appId smuggled into the request payload', async () => {
    await executeStorageRequest('victim-app', {
      operation: 'store',
      collectionName: 'smuggle',
      record: { secret: 'victim data' },
    })

    const found = await executeStorageRequest('attacker-app', {
      operation: 'query',
      collectionName: 'smuggle',
      ...({ appId: 'victim-app' } as Record<string, unknown>),
    })

    expect(found).toEqual([])
  })

  it('cannot use a record or filter to widen the query beyond its own collection', async () => {
    await executeStorageRequest('victim-app', {
      operation: 'store',
      collectionName: 'widen',
      record: { secret: 'victim data' },
    })

    for (const filter of [{ $where: 'true' }, { 'a.b': 1 }, { _id: 'anything' }]) {
      await expectRejectedWith(
        executeStorageRequest('attacker-app', {
          operation: 'query',
          collectionName: 'widen',
          filter,
        }),
        'APP_STORAGE_INVALID_FILTER',
      )
    }
  })

  it('keeps two apps using the same logical collection name fully separated', async () => {
    await executeStorageRequest('app-one', {
      operation: 'store',
      collectionName: 'shared',
      record: { owner: 'one' },
    })
    await executeStorageRequest('app-two', {
      operation: 'store',
      collectionName: 'shared',
      record: { owner: 'two' },
    })

    const forOne = (await executeStorageRequest('app-one', {
      operation: 'query',
      collectionName: 'shared',
    })) as StoredRecord[]
    const forTwo = (await executeStorageRequest('app-two', {
      operation: 'query',
      collectionName: 'shared',
    })) as StoredRecord[]

    expect(forOne.map((record) => record.owner)).toEqual(['one'])
    expect(forTwo.map((record) => record.owner)).toEqual(['two'])
    expect(await collectionNames()).toEqual(
      expect.arrayContaining(['app_app-one_shared', 'app_app-two_shared']),
    )
  })
})
