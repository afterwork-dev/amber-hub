import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'

let mongod: MongoMemoryServer
let connectMongo: (typeof import('../../../db/mongoClient'))['connectMongo']
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']
let appDataRepository: typeof import('../appDataRepository')

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()

  const mongoClient = await import('../../../db/mongoClient')
  connectMongo = mongoClient.connectMongo
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb
  appDataRepository = await import('../appDataRepository')

  await connectMongo()
}, 60_000)

afterAll(async () => {
  await disconnectMongo()
  await mongod.stop()
})

describe('appDataRepository.insert', () => {
  it('assigns a string id and returns the stored fields', async () => {
    const stored = await appDataRepository.insert('app_test-app_notes', {
      text: 'hello',
      done: false,
    })

    expect(stored.id).toBeTruthy()
    expect(typeof stored.id).toBe('string')
    expect(stored.text).toBe('hello')
    expect(stored.done).toBe(false)
  })

  it('never exposes the underlying _id', async () => {
    const stored = await appDataRepository.insert('app_test-app_notes', { text: 'x' })

    expect(stored).not.toHaveProperty('_id')
  })

  it('writes into exactly the physical collection it was given', async () => {
    await appDataRepository.insert('app_naming-app_targeted', { marker: 'here' })

    const documents = await getDb().collection('app_naming-app_targeted').find({}).toArray()
    expect(documents).toHaveLength(1)
    expect(documents[0]).toMatchObject({ marker: 'here' })
  })
})

describe('appDataRepository.find', () => {
  const collection = 'app_find-app_items'

  beforeAll(async () => {
    await appDataRepository.insert(collection, { name: 'a', done: false, count: 1 })
    await appDataRepository.insert(collection, { name: 'b', done: true, count: 2 })
    await appDataRepository.insert(collection, { name: 'c', done: false, count: 3 })
  })

  it('returns every record for an empty filter', async () => {
    const found = await appDataRepository.find(collection, {})

    expect(found).toHaveLength(3)
  })

  it('returns only the records matching an equality filter', async () => {
    const found = await appDataRepository.find(collection, { done: false })

    expect(found.map((record) => record.name).sort()).toEqual(['a', 'c'])
  })

  it('ANDs multiple filter keys together', async () => {
    const found = await appDataRepository.find(collection, { done: false, count: 3 })

    expect(found).toHaveLength(1)
    expect(found[0]?.name).toBe('c')
  })

  it('maps the filter key id onto the underlying _id', async () => {
    const stored = await appDataRepository.insert(collection, { name: 'by-id' })

    const found = await appDataRepository.find(collection, { id: stored.id })

    expect(found).toHaveLength(1)
    expect(found[0]?.name).toBe('by-id')
  })

  it('matches nothing when the id filter is not a valid identifier', async () => {
    const found = await appDataRepository.find(collection, { id: 'not-an-id' })

    expect(found).toEqual([])
  })

  it('returns an empty array for a collection that was never written to', async () => {
    const found = await appDataRepository.find('app_find-app_never-written', {})

    expect(found).toEqual([])
  })
})

describe('appDataRepository.replace', () => {
  const collection = 'app_replace-app_notes'

  it('replaces every app field and keeps the id stable', async () => {
    const stored = await appDataRepository.insert(collection, { text: 'before', done: false })

    const replaced = await appDataRepository.replace(collection, stored.id, { text: 'after' })

    expect(replaced?.id).toBe(stored.id)
    expect(replaced?.text).toBe('after')
    expect(replaced).not.toHaveProperty('done')

    const found = await appDataRepository.find(collection, { id: stored.id })
    expect(found[0]?.text).toBe('after')
    expect(found[0]).not.toHaveProperty('done')
  })

  it('reports a miss for an unknown id without inserting anything', async () => {
    const before = await appDataRepository.find(collection, {})

    const replaced = await appDataRepository.replace(collection, '507f1f77bcf86cd799439011', {
      text: 'ghost',
    })

    expect(replaced).toBeNull()
    expect(await appDataRepository.find(collection, {})).toHaveLength(before.length)
  })

  it('reports a miss for a malformed id', async () => {
    expect(await appDataRepository.replace(collection, 'not-an-id', { text: 'x' })).toBeNull()
  })
})

describe('appDataRepository.deleteById', () => {
  const collection = 'app_delete-app_notes'

  it('deletes the record and reports success', async () => {
    const stored = await appDataRepository.insert(collection, { text: 'temporary' })

    expect(await appDataRepository.deleteById(collection, stored.id)).toBe(true)
    expect(await appDataRepository.find(collection, { id: stored.id })).toEqual([])
  })

  it('reports a miss for an unknown id', async () => {
    expect(await appDataRepository.deleteById(collection, '507f1f77bcf86cd799439011')).toBe(false)
  })

  it('reports a miss for a malformed id', async () => {
    expect(await appDataRepository.deleteById(collection, 'not-an-id')).toBe(false)
  })
})
