import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from '../../../errors/AppError'
import {
  forwardCall,
  getBackendStatusForTests,
  resetAppBackendsForTests,
  startAppBackends,
  startBackendIfDeclared,
} from '../appBackendManager'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

async function installFixtureApp(appsStoragePath: string, appId: string, fixtureFile: string): Promise<void> {
  const appDir = join(appsStoragePath, appId)
  await mkdir(appDir, { recursive: true })
  await writeFile(
    join(appDir, 'manifest.json'),
    JSON.stringify({
      id: appId,
      displayName: appId,
      version: '1.0.0',
      backend: { entry: 'index.js' },
    }),
    'utf-8',
  )
  await copyFile(join(FIXTURES_DIR, fixtureFile), join(appDir, 'index.js'))
}

async function installNoBackendApp(appsStoragePath: string, appId: string): Promise<void> {
  const appDir = join(appsStoragePath, appId)
  await mkdir(appDir, { recursive: true })
  await writeFile(
    join(appDir, 'manifest.json'),
    JSON.stringify({ id: appId, displayName: appId, version: '1.0.0' }),
    'utf-8',
  )
}

interface StoredNote {
  id: string
  [field: string]: unknown
}

function callContext(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    path: '/whoami',
    query: {},
    body: null,
    user: { id: 'user-1', username: 'alice' },
    ...overrides,
  }
}

async function waitUntilStatus(appId: string, status: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (getBackendStatusForTests(appId)?.status === status) {
      return
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20))
  }
  throw new Error(`Timed out waiting for "${appId}" to reach status "${status}"`)
}

describe('appBackendManager.forwardCall', () => {
  let appsStoragePath: string
  const originalStartTimeout = process.env.APP_BACKEND_START_TIMEOUT_MS
  const originalCallTimeout = process.env.APP_BACKEND_CALL_TIMEOUT_MS

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'app-backend-manager-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    resetAppBackendsForTests()
    process.env.APP_BACKEND_START_TIMEOUT_MS = originalStartTimeout
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = originalCallTimeout
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('forwards a call to an already-running backend and succeeds', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app', 'echoApp.js')
    await startBackendIfDeclared('echo-app')

    const result = await forwardCall('echo-app', callContext())

    expect(result).toEqual({ status: 200, body: { calledBy: 'alice' } })
  }, 10000)

  it('rejects with APP_BACKEND_CRASHED when a declared backend has not been started yet', async () => {
    await installFixtureApp(appsStoragePath, 'not-yet-started-app', 'echoApp.js')

    await expect(forwardCall('not-yet-started-app', callContext())).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_CRASHED',
    })
  })

  it('resolves two concurrent calls to their own correct responses', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app-concurrent', 'echoApp.js')
    await startBackendIfDeclared('echo-app-concurrent')

    const [aliceResult, bobResult] = await Promise.all([
      forwardCall('echo-app-concurrent', callContext({ user: { id: 'user-1', username: 'alice' } })),
      forwardCall('echo-app-concurrent', callContext({ user: { id: 'user-2', username: 'bob' } })),
    ])

    expect(aliceResult).toEqual({ status: 200, body: { calledBy: 'alice' } })
    expect(bobResult).toEqual({ status: 200, body: { calledBy: 'bob' } })
  }, 10000)

  it('restarts once after a crash, then marks the app unhealthy after a second crash, failing fast without spawning again', async () => {
    await installFixtureApp(appsStoragePath, 'crashing-app', 'crashingApp.js')
    await startBackendIfDeclared('crashing-app')
    const pidBeforeCrash = getBackendStatusForTests('crashing-app')?.pid

    await expect(
      forwardCall('crashing-app', callContext({ path: '/crash' })),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_CRASHED' })

    await waitUntilStatus('crashing-app', 'running')
    const pidAfterRestart = getBackendStatusForTests('crashing-app')?.pid
    expect(pidAfterRestart).toBeDefined()
    expect(pidAfterRestart).not.toBe(pidBeforeCrash)

    await expect(
      forwardCall('crashing-app', callContext({ path: '/crash' })),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_CRASHED' })

    expect(getBackendStatusForTests('crashing-app')?.status).toBe('crashed')

    const pidWhileCrashed = getBackendStatusForTests('crashing-app')?.pid
    await expect(forwardCall('crashing-app', callContext({ path: '/crash' }))).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_CRASHED',
    })
    expect(getBackendStatusForTests('crashing-app')?.pid).toBe(pidWhileCrashed)
  }, 15000)

  it('rejects with APP_BACKEND_TIMEOUT once the call timeout elapses, without crashing the process', async () => {
    await installFixtureApp(appsStoragePath, 'slow-app', 'slowApp.js')
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = '300'
    await startBackendIfDeclared('slow-app')

    await expect(
      forwardCall('slow-app', callContext({ path: '/slow' })),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_TIMEOUT' })

    expect(getBackendStatusForTests('slow-app')?.status).toBe('running')
  }, 10000)

  it('rejects with APP_BACKEND_NOT_DECLARED for an app with no declared backend', async () => {
    await installNoBackendApp(appsStoragePath, 'no-backend-app')

    await expect(forwardCall('no-backend-app', callContext())).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_NOT_DECLARED',
    })
  })

  it('rejects with APP_NOT_FOUND for an unknown app id', async () => {
    await expect(forwardCall('unknown-app', callContext())).rejects.toMatchObject({
      errorCode: 'APP_NOT_FOUND',
    })
  })

  it('rejects with APP_BACKEND_ROUTE_NOT_FOUND when the running backend has no matching route', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app-unmatched', 'echoApp.js')
    await startBackendIfDeclared('echo-app-unmatched')

    await expect(
      forwardCall('echo-app-unmatched', callContext({ path: '/does-not-exist' })),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_ROUTE_NOT_FOUND' })
  }, 10000)

  it('rejects with APP_BACKEND_HANDLER_ERROR without leaking the thrown message when a handler throws', async () => {
    await installFixtureApp(appsStoragePath, 'throwing-app', 'throwingApp.js')
    await startBackendIfDeclared('throwing-app')

    const error: AppError = await forwardCall('throwing-app', callContext({ path: '/throw' })).catch(
      (err) => err,
    )

    expect(error.errorCode).toBe('APP_BACKEND_HANDLER_ERROR')
    expect(error.message).not.toContain('this internal detail should never reach the caller')
  }, 10000)

  it('keeps a different app fully functional while another app is down (isolation)', async () => {
    await installFixtureApp(appsStoragePath, 'crashing-app-isolated', 'crashingApp.js')
    await installFixtureApp(appsStoragePath, 'echo-app-isolated', 'echoApp.js')
    await startBackendIfDeclared('crashing-app-isolated')
    await startBackendIfDeclared('echo-app-isolated')

    await expect(
      forwardCall('crashing-app-isolated', callContext({ path: '/crash' })),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_CRASHED' })

    await expect(forwardCall('echo-app-isolated', callContext())).resolves.toEqual({
      status: 200,
      body: { calledBy: 'alice' },
    })
  }, 15000)
})

describe('appBackendManager eager startup', () => {
  let appsStoragePath: string
  const originalStartTimeout = process.env.APP_BACKEND_START_TIMEOUT_MS

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'app-backend-manager-eager-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    resetAppBackendsForTests()
    process.env.APP_BACKEND_START_TIMEOUT_MS = originalStartTimeout
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('starts a declared backend without waiting for any call', async () => {
    await installFixtureApp(appsStoragePath, 'eager-echo-app', 'echoApp.js')

    await startBackendIfDeclared('eager-echo-app')

    expect(getBackendStatusForTests('eager-echo-app')?.status).toBe('running')
  }, 10000)

  it('silently no-ops for an app with no declared backend', async () => {
    await installNoBackendApp(appsStoragePath, 'eager-no-backend-app')

    await expect(startBackendIfDeclared('eager-no-backend-app')).resolves.toBeUndefined()

    expect(getBackendStatusForTests('eager-no-backend-app')).toBeUndefined()
  })

  it('does not throw for an unknown app id', async () => {
    await expect(startBackendIfDeclared('unknown-eager-app')).resolves.toBeUndefined()
  })

  it('marks the app crashed (without throwing) when the start-up timeout elapses for a backend that never becomes ready', async () => {
    await installFixtureApp(appsStoragePath, 'never-ready-app', 'neverReadyApp.js')
    process.env.APP_BACKEND_START_TIMEOUT_MS = '300'

    await expect(startBackendIfDeclared('never-ready-app')).resolves.toBeUndefined()

    expect(getBackendStatusForTests('never-ready-app')?.status).toBe('crashed')
    await expect(forwardCall('never-ready-app', callContext())).rejects.toMatchObject({
      errorCode: 'APP_BACKEND_CRASHED',
    })
  }, 10000)

  it('starts every declared backend and leaves apps with no backend untouched', async () => {
    await installFixtureApp(appsStoragePath, 'boot-echo-app', 'echoApp.js')
    await installNoBackendApp(appsStoragePath, 'boot-no-backend-app')

    await startAppBackends()

    expect(getBackendStatusForTests('boot-echo-app')?.status).toBe('running')
    expect(getBackendStatusForTests('boot-no-backend-app')).toBeUndefined()
  }, 10000)
})

describe('appBackendManager app storage', () => {
  let appsStoragePath: string
  let mongod: MongoMemoryServer
  let mongoClient: typeof import('../../../db/mongoClient')

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    mongoClient = await import('../../../db/mongoClient')
    await mongoClient.connectMongo()
  }, 60000)

  afterAll(async () => {
    await mongoClient.disconnectMongo()
    await mongod.stop()
  })

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'app-backend-manager-storage-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    resetAppBackendsForTests()
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  async function startStorageApp(appId: string): Promise<void> {
    await installFixtureApp(appsStoragePath, appId, 'storageApp.js')
    await startBackendIfDeclared(appId)
  }

  async function storeNote(appId: string, note: Record<string, unknown>): Promise<StoredNote> {
    const result = await forwardCall(appId, callContext({ method: 'POST', path: '/notes', body: note }))
    return (result.body as { note: StoredNote }).note
  }

  async function readNotes(appId: string, query: Record<string, string> = {}): Promise<StoredNote[]> {
    const result = await forwardCall(appId, callContext({ path: '/notes', query }))
    return (result.body as { notes: StoredNote[] }).notes
  }

  async function collectionNames(): Promise<string[]> {
    return (await mongoClient.getDb().listCollections().toArray()).map((info) => info.name)
  }

  it('stores a record from a route handler and returns it with a Hub-assigned id', async () => {
    await startStorageApp('storage-app')

    const note = await storeNote('storage-app', { text: 'hello', done: false })

    expect(note.id).toBeTruthy()
    expect(note.text).toBe('hello')
    expect(note.done).toBe(false)
  }, 15000)

  it('reads a previously stored record back unchanged on a later call', async () => {
    await startStorageApp('storage-readback-app')
    const stored = await storeNote('storage-readback-app', { text: 'remember me', done: false })

    const notes = await readNotes('storage-readback-app')

    expect(notes).toHaveLength(1)
    expect(notes[0]).toEqual({ id: stored.id, text: 'remember me', done: false })
  }, 15000)

  it('keeps records readable after the app backend is restarted', async () => {
    await startStorageApp('storage-restart-app')
    const stored = await storeNote('storage-restart-app', { text: 'survives restart' })

    resetAppBackendsForTests()
    await startBackendIfDeclared('storage-restart-app')

    const notes = await readNotes('storage-restart-app')
    expect(notes).toEqual([{ id: stored.id, text: 'survives restart' }])
  }, 20000)

  it('writes into the Hub-derived physical collection app_{appId}_{collectionName}', async () => {
    await startStorageApp('naming-app')

    await storeNote('naming-app', { text: 'x' })

    expect(await collectionNames()).toContain('app_naming-app_notes')
  }, 15000)

  it('serves storage requests made during init(), before the backend is ready', async () => {
    await startStorageApp('init-storage-app')

    const result = await forwardCall('init-storage-app', callContext({ path: '/boot-record' }))

    expect((result.body as { bootRecord: StoredNote }).bootRecord).toMatchObject({
      startedAt: 'init',
    })
    expect((result.body as { bootRecord: StoredNote }).bootRecord.id).toBeTruthy()
    expect(await collectionNames()).toContain('app_init-storage-app_boot')
  }, 15000)

  it('surfaces a storage failure inside the app as a catchable AppStorageError', async () => {
    await startStorageApp('storage-error-app')

    const result = await forwardCall(
      'storage-error-app',
      callContext({ path: '/caught-error', query: { id: '507f1f77bcf86cd799439011' } }),
    )

    expect(result.body).toMatchObject({
      name: 'AppStorageError',
      errorCode: 'APP_STORAGE_RECORD_NOT_FOUND',
    })
  }, 15000)

  it('returns exactly the records matching a filter', async () => {
    await startStorageApp('storage-filter-app')
    await storeNote('storage-filter-app', { text: 'open one', done: false })
    await storeNote('storage-filter-app', { text: 'closed', done: true })
    await storeNote('storage-filter-app', { text: 'open two', done: false })

    const open = await readNotes('storage-filter-app', { done: 'false' })
    const closed = await readNotes('storage-filter-app', { done: 'true' })

    expect(open.map((note) => note.text).sort()).toEqual(['open one', 'open two'])
    expect(closed.map((note) => note.text)).toEqual(['closed'])
    expect(await readNotes('storage-filter-app')).toHaveLength(3)
  }, 15000)

  it('replaces a record when storing with an existing id, keeping the id stable', async () => {
    await startStorageApp('storage-update-app')
    const stored = await storeNote('storage-update-app', { text: 'before', done: false })

    const replaced = await storeNote('storage-update-app', { id: stored.id, text: 'after' })

    expect(replaced.id).toBe(stored.id)
    const notes = await readNotes('storage-update-app')
    expect(notes).toEqual([{ id: stored.id, text: 'after' }])
  }, 15000)

  it('rejects storing with an unknown id instead of silently inserting a new record', async () => {
    await startStorageApp('storage-ghost-app')
    await storeNote('storage-ghost-app', { text: 'the only record' })

    await expect(
      forwardCall(
        'storage-ghost-app',
        callContext({
          method: 'POST',
          path: '/notes',
          body: { id: '507f1f77bcf86cd799439011', text: 'ghost' },
        }),
      ),
    ).rejects.toMatchObject({ errorCode: 'APP_BACKEND_HANDLER_ERROR' })

    expect(await readNotes('storage-ghost-app')).toHaveLength(1)
  }, 15000)

  it('deletes a record so later reads and filtered queries no longer return it', async () => {
    await startStorageApp('storage-delete-app')
    const keep = await storeNote('storage-delete-app', { text: 'keep', done: false })
    const remove = await storeNote('storage-delete-app', { text: 'remove', done: false })

    await forwardCall(
      'storage-delete-app',
      callContext({ method: 'DELETE', path: '/notes', query: { id: remove.id } }),
    )

    expect(await readNotes('storage-delete-app')).toEqual([
      { id: keep.id, text: 'keep', done: false },
    ])
    expect(await readNotes('storage-delete-app', { done: 'false' })).toHaveLength(1)
  }, 15000)

  it('reports deleting an already-deleted record as a distinguishable not-found error', async () => {
    await startStorageApp('storage-double-delete-app')
    const note = await storeNote('storage-double-delete-app', { text: 'delete me twice' })
    const deleteCall = callContext({ method: 'DELETE', path: '/notes', query: { id: note.id } })

    await forwardCall('storage-double-delete-app', deleteCall)

    const result = await forwardCall(
      'storage-double-delete-app',
      callContext({ path: '/caught-error', query: { id: note.id } }),
    )
    expect(result.body).toMatchObject({
      name: 'AppStorageError',
      errorCode: 'APP_STORAGE_RECORD_NOT_FOUND',
    })
  }, 15000)

  it('degrades non-JSON values exactly as the SDK contract documents, and round-trips the rest', async () => {
    await startStorageApp('storage-edges-app')

    const result = await forwardCall(
      'storage-edges-app',
      callContext({ method: 'POST', path: '/json-edges' }),
    )
    const stored = (result.body as { stored: StoredNote }).stored

    // Documented in storage-contract.md: Dates are not representable — store ISO strings.
    expect(stored.when).toBe('2026-01-02T03:04:05.000Z')
    expect(stored).not.toHaveProperty('missing')
    expect(stored.notANumber).toBeNull()
    // Everything JSON-safe survives untouched, nesting included.
    expect(stored.nested).toEqual({ list: [1, 'two', { three: true }], deep: { deeper: null } })
  }, 15000)

  it('keeps two apps using the same logical collection name completely separated', async () => {
    await startStorageApp('app-one')
    await installFixtureApp(appsStoragePath, 'app-two', 'storageAppTwo.js')
    await startBackendIfDeclared('app-two')

    await forwardCall(
      'app-one',
      callContext({ method: 'POST', path: '/items', body: { owner: 'one' } }),
    )
    await forwardCall(
      'app-two',
      callContext({ method: 'POST', path: '/items', body: { owner: 'two' } }),
    )

    const oneItems = (
      (await forwardCall('app-one', callContext({ path: '/items' }))).body as {
        items: StoredNote[]
      }
    ).items
    const twoItems = (
      (await forwardCall('app-two', callContext({ path: '/items' }))).body as {
        items: StoredNote[]
      }
    ).items

    expect(oneItems.map((item) => item.owner)).toEqual(['one'])
    expect(twoItems.map((item) => item.owner)).toEqual(['two'])
    expect(await collectionNames()).toEqual(
      expect.arrayContaining(['app_app-one_items', 'app_app-two_items']),
    )
  }, 20000)

  it('cannot reach another app’s data by naming its collection, however it is spelled', async () => {
    await startStorageApp('victim-app')
    await installFixtureApp(appsStoragePath, 'attacker-app', 'storageAppTwo.js')
    await startBackendIfDeclared('attacker-app')
    await forwardCall(
      'victim-app',
      callContext({ method: 'POST', path: '/items', body: { secret: 'victim data' } }),
    )

    for (const collection of [
      'app_victim-app_items',
      '../victim-app/items',
      'victim-app_items',
      '$victim',
      'items.victim',
      'users',
    ]) {
      const result = await forwardCall(
        'attacker-app',
        callContext({ path: '/reach', query: { collection } }),
      )
      const body = result.body as { items?: StoredNote[]; errorCode?: string }

      // Either the name is rejected outright, or it is scoped to the attacker's own namespace —
      // never does it return the victim's data.
      expect(JSON.stringify(body)).not.toContain('victim data')
      expect(body.items ?? []).toEqual([])
    }
  }, 25000)

  it('leaves Hub-owned collections untouched by app storage', async () => {
    await mongoClient.getDb().collection('users').insertOne({ username: 'hub-owned' })
    await startStorageApp('tidy-app')

    await storeNote('tidy-app', { text: 'app data' })

    const users = await mongoClient.getDb().collection('users').find({}).toArray()
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ username: 'hub-owned' })
    expect((await collectionNames()).filter((name) => name.startsWith('app_'))).not.toContain(
      'users',
    )
  }, 15000)

  it('rejects an invalid collection name without creating any collection', async () => {
    await startStorageApp('storage-invalid-app')
    const before = await collectionNames()

    const result = await forwardCall(
      'storage-invalid-app',
      callContext({ path: '/caught-error', query: { collection: 'Invalid Name', id: 'x' } }),
    )

    expect(result.body).toMatchObject({ errorCode: 'APP_STORAGE_INVALID_COLLECTION_NAME' })
    expect(await collectionNames()).toEqual(before)
  }, 15000)
})
