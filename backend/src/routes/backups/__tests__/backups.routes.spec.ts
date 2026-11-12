import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { BSON, ObjectId } from 'mongodb'
import { extract } from 'tar'

let mongod: MongoMemoryServer
let server: FastifyInstance
let storagePath: string
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let getDb: (typeof import('../../../db/mongoClient'))['getDb']
let recoverBackups: (typeof import('../../../services/backups/backupService'))['recoverBackups']
let token: string

function request(method: 'GET' | 'POST' | 'DELETE', url: string) {
  return server.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    ...(method === 'POST' ? { payload: {} } : {}),
  })
}

async function waitForSettled(id: string): Promise<Record<string, unknown>> {
  return vi.waitFor(
    async () => {
      const backups = (await request('GET', '/api/backups')).json().data.backups
      const backup = backups.find((b: { id: string }) => b.id === id)
      if (!backup || backup.status === 'in_progress') {
        throw new Error('still in progress')
      }
      return backup
    },
    { timeout: 10_000, interval: 50 },
  )
}

async function createReadyBackup(): Promise<string> {
  const response = await request('POST', '/api/backups')
  expect(response.statusCode).toBe(202)
  const id = response.json().data.id
  expect((await waitForSettled(id)).status).toBe('ready')
  return id
}

function readBsonDocuments(buffer: Buffer): BSON.Document[] {
  const documents: BSON.Document[] = []
  let offset = 0
  while (offset < buffer.length) {
    const length = buffer.readInt32LE(offset)
    documents.push(BSON.deserialize(buffer.subarray(offset, offset + length)))
    offset += length
  }
  return documents
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri('amber-test')
  process.env.JWT_SECRET = 'test-secret'
  storagePath = await mkdtemp(join(tmpdir(), 'amber-backups-'))
  process.env.BACKUP_STORAGE_PATH = storagePath

  const mongoClient = await import('../../../db/mongoClient')
  disconnectMongo = mongoClient.disconnectMongo
  getDb = mongoClient.getDb
  await mongoClient.connectMongo()

  const backupRepository = await import('../../../repositories/backup/backupRepository')
  await backupRepository.ensureIndexes()
  recoverBackups = (await import('../../../services/backups/backupService')).recoverBackups

  const { issueAccessToken } = await import('../../../services/auth/tokenService')
  token = issueAccessToken({
    id: new ObjectId().toString(),
    username: 'alice',
    passwordHash: 'irrelevant',
    createdAt: new Date(),
  }).token

  const db = getDb()
  await db.collection('users').insertOne({ username: 'alice', createdAt: new Date() })
  await db
    .collection('app_demo_entries')
    .insertMany([{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: 20.5 }])
  await db.createCollection('app_demo_view', { viewOn: 'app_demo_entries', pipeline: [] })

  const { buildServer } = await import('../../../buildServer')
  const { backupsRoutes } = await import('../backups.routes')
  server = await buildServer()
  await server.register(backupsRoutes, { prefix: '/api' })
}, 60_000)

afterEach(() => {
  process.env.BACKUP_STORAGE_PATH = storagePath
  vi.restoreAllMocks()
})

afterAll(async () => {
  await server.close()
  await disconnectMongo()
  await mongod.stop()
  await rm(storagePath, { recursive: true, force: true })
  delete process.env.BACKUP_STORAGE_PATH
})

describe('POST /api/backups', () => {
  it('starts a backup and returns it as in progress', async () => {
    const response = await request('POST', '/api/backups')

    expect(response.statusCode).toBe(202)
    const { data } = response.json()
    expect(data).toEqual({
      id: expect.any(String),
      status: 'in_progress',
      createdAt: expect.any(String),
      completedAt: null,
      createdByUsername: 'alice',
      sizeBytes: null,
      errorMessage: null,
    })

    const settled = await waitForSettled(data.id)
    expect(settled).toMatchObject({ status: 'ready', sizeBytes: expect.any(Number) })
  })

  it('allows only one backup at a time', async () => {
    const responses = await Promise.all([
      request('POST', '/api/backups'),
      request('POST', '/api/backups'),
    ])

    const statuses = responses.map((r) => r.statusCode).sort()
    expect(statuses).toEqual([202, 409])
    const conflict = responses.find((r) => r.statusCode === 409)!
    expect(conflict.json().error.errorCode).toBe('BACKUP_IN_PROGRESS')

    const created = responses.find((r) => r.statusCode === 202)!
    await waitForSettled(created.json().data.id)
  })

  it('writes an archive with a manifest and every collection except backups and views', async () => {
    const id = await createReadyBackup()
    const extractDir = await mkdtemp(join(tmpdir(), 'amber-backup-extract-'))

    try {
      await extract({ file: join(storagePath, `${id}.tar.gz`), cwd: extractDir })

      const manifest = JSON.parse(await readFile(join(extractDir, 'manifest.json'), 'utf8'))
      expect(manifest).toMatchObject({ formatVersion: 1, databaseName: 'amber-test' })
      expect(manifest.collections).toEqual([
        { name: 'app_demo_entries', documentCount: 2 },
        { name: 'users', documentCount: 1 },
      ])

      const dumpDir = join(extractDir, 'dump', 'amber-test')
      expect((await readdir(dumpDir)).sort()).toEqual(['app_demo_entries.bson', 'users.bson'])

      const entries = readBsonDocuments(await readFile(join(dumpDir, 'app_demo_entries.bson')))
      expect(entries.map((e) => e.amount).sort()).toEqual([10, 20.5])
      expect(entries[0]?._id).toBeInstanceOf(ObjectId)
    } finally {
      await rm(extractDir, { recursive: true, force: true })
    }
  })

  it('marks the backup failed with a generic message when it cannot be written', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const blocker = join(storagePath, 'not-a-directory')
    await writeFile(blocker, '')
    process.env.BACKUP_STORAGE_PATH = blocker

    const response = await request('POST', '/api/backups')
    const settled = await waitForSettled(response.json().data.id)

    expect(settled).toMatchObject({
      status: 'failed',
      sizeBytes: null,
      errorMessage: 'The backup could not be created',
    })
    await rm(blocker)
  })
})

describe('GET /api/backups', () => {
  it('lists backups newest first', async () => {
    const first = await createReadyBackup()
    const second = await createReadyBackup()

    const ids = (await request('GET', '/api/backups')).json().data.backups.map((b: { id: string }) => b.id)

    expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first))
  })
})

describe('GET /api/backups/:id/download', () => {
  it('streams the archive as an attachment', async () => {
    const id = await createReadyBackup()
    const { size } = await stat(join(storagePath, `${id}.tar.gz`))

    const response = await request('GET', `/api/backups/${id}/download`)

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('application/gzip')
    expect(Number(response.headers['content-length'])).toBe(size)
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="amber-hub-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.tar\.gz"$/,
    )
    expect(response.rawPayload.length).toBe(size)
  })

  it.each(['not-an-id', new ObjectId().toString()])('returns 404 for unknown id %s', async (id) => {
    const response = await request('GET', `/api/backups/${id}/download`)

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('NOT_FOUND')
  })

  it('returns 404 when the archive file is gone', async () => {
    const id = await createReadyBackup()
    await rm(join(storagePath, `${id}.tar.gz`))

    const response = await request('GET', `/api/backups/${id}/download`)

    expect(response.statusCode).toBe(404)
  })
})

describe('DELETE /api/backups/:id', () => {
  it('removes the record and the archive', async () => {
    const id = await createReadyBackup()

    const response = await request('DELETE', `/api/backups/${id}`)

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toEqual({ id })
    await expect(stat(join(storagePath, `${id}.tar.gz`))).rejects.toThrow()
    const ids = (await request('GET', '/api/backups')).json().data.backups.map((b: { id: string }) => b.id)
    expect(ids).not.toContain(id)
  })

  it('refuses to delete a backup that is still in progress', async () => {
    const _id = new ObjectId()
    await getDb().collection('backups').insertOne({ _id, status: 'in_progress', createdAt: new Date() })

    const response = await request('DELETE', `/api/backups/${_id}`)

    expect(response.statusCode).toBe(409)
    expect(response.json().error.errorCode).toBe('BACKUP_IN_PROGRESS')
    await getDb().collection('backups').deleteOne({ _id })
  })

  it.each(['not-an-id', new ObjectId().toString()])('returns 404 for unknown id %s', async (id) => {
    const response = await request('DELETE', `/api/backups/${id}`)

    expect(response.statusCode).toBe(404)
  })
})

describe('recoverBackups', () => {
  it('fails interrupted and missing backups and removes leftover files', async () => {
    const backups = getDb().collection('backups')
    const interrupted = new ObjectId()
    const missingFile = new ObjectId()
    const orphan = new ObjectId()
    const base = { createdAt: new Date(), completedAt: null, createdByUsername: 'alice', errorMessage: null }
    await backups.insertMany([
      { _id: interrupted, status: 'in_progress', sizeBytes: null, ...base },
      { _id: missingFile, status: 'ready', sizeBytes: 10, ...base },
    ])
    await mkdir(join(storagePath, `${interrupted}.work`))
    await writeFile(join(storagePath, `${orphan}.tar.gz`), 'orphan')
    await writeFile(join(storagePath, 'unrelated.txt'), 'keep')

    await recoverBackups()

    expect(await backups.findOne({ _id: interrupted })).toMatchObject({
      status: 'failed',
      errorMessage: 'The backup was interrupted by a restart',
    })
    expect(await backups.findOne({ _id: missingFile })).toMatchObject({
      status: 'failed',
      errorMessage: 'The backup file is missing',
    })
    const entries = await readdir(storagePath)
    expect(entries).not.toContain(`${interrupted}.work`)
    expect(entries).not.toContain(`${orphan}.tar.gz`)
    expect(entries).toContain('unrelated.txt')
    expect((await stat(storagePath)).mode & 0o777).toBe(0o700)
  })
})
