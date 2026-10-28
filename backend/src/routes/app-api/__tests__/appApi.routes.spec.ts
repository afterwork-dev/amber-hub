import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { buildServer } from '../../../buildServer'
import { appApiRoutes } from '../appApi.routes'
import {
  resetAppBackendsForTests,
  startBackendIfDeclared,
} from '../../../services/appBackends/appBackendManager'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'services',
  'appBackends',
  '__tests__',
  'fixtures',
)

function cookieHeader(username = 'alice'): { cookie: string } {
  const token = jwt.sign({ username, type: 'access' }, 'test-secret', { subject: 'user-1' })
  return { cookie: `accessToken=${token}` }
}

async function installFixtureApp(appsStoragePath: string, appId: string, fixtureFile: string): Promise<void> {
  const appDir = join(appsStoragePath, appId)
  await mkdir(appDir, { recursive: true })
  await writeFile(
    join(appDir, 'manifest.json'),
    JSON.stringify({ id: appId, displayName: appId, version: '1.0.0', backend: { entry: 'index.js' } }),
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

describe('ALL /app-api/:appId/*', () => {
  let server: FastifyInstance
  let appsStoragePath: string
  let mongod: MongoMemoryServer
  let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
  let apiKey: string
  const originalJwtSecret = process.env.JWT_SECRET
  const originalCallTimeout = process.env.APP_BACKEND_CALL_TIMEOUT_MS

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret'

    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    const mongoClient = await import('../../../db/mongoClient')
    disconnectMongo = mongoClient.disconnectMongo
    await mongoClient.connectMongo()

    const apiKeyRepository = await import('../../../repositories/apiKey/apiKeyRepository')
    await apiKeyRepository.ensureIndexes()

    const userRepository = await import('../../../repositories/user/userRepository')
    const user = await userRepository.create({
      id: '',
      username: 'keyowner',
      passwordHash: 'irrelevant',
      createdAt: new Date(),
    })

    const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
    apiKey = (await createApiKey(user.id, { validityDays: 30 })).key

    server = await buildServer()
    await server.register(appApiRoutes, { prefix: '/app-api' })
  }, 60_000)

  afterAll(async () => {
    await server.close()
    await disconnectMongo()
    await mongod.stop()
    process.env.JWT_SECRET = originalJwtSecret
  })

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'app-api-routes-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    resetAppBackendsForTests()
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = originalCallTimeout
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('returns 401 UNAUTHORIZED when no accessToken cookie is present', async () => {
    const response = await server.inject({ method: 'GET', url: '/app-api/echo-app/whoami' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it('returns 404 APP_NOT_FOUND for an unknown appId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/app-api/unknown-app/whoami',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_NOT_FOUND')
  })

  it('returns 404 APP_BACKEND_NOT_DECLARED for an app with no declared backend', async () => {
    await installNoBackendApp(appsStoragePath, 'no-backend-app')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/no-backend-app/whoami',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_BACKEND_NOT_DECLARED')
  })

  it('returns 502 APP_BACKEND_CRASHED for a declared backend that has not been started yet', async () => {
    await installFixtureApp(appsStoragePath, 'not-yet-started-app', 'echoApp.js')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/not-yet-started-app/whoami',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(502)
    expect(response.json().error.errorCode).toBe('APP_BACKEND_CRASHED')
  })

  it("returns 200 with the calling user's identity from echoApp's registered route", async () => {
    await installFixtureApp(appsStoragePath, 'echo-app', 'echoApp.js')
    await startBackendIfDeclared('echo-app')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/echo-app/whoami',
      headers: cookieHeader('alice'),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true, data: { calledBy: 'alice' }, error: null })
  }, 10000)

  it('authenticates by API key and forwards the key owner to the app backend', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app-key', 'echoApp.js')
    await startBackendIfDeclared('echo-app-key')

    const withKey = await server.inject({
      method: 'GET',
      url: '/app-api/echo-app-key/whoami',
      headers: { authorization: `Bearer ${apiKey}` },
    })

    expect(withKey.statusCode).toBe(200)
    expect(withKey.json()).toEqual({ success: true, data: { calledBy: 'keyowner' }, error: null })

    const withCookie = await server.inject({
      method: 'GET',
      url: '/app-api/echo-app-key/whoami',
      headers: cookieHeader('alice'),
    })

    expect(withCookie.statusCode).toBe(200)
    expect(withCookie.json().data).toEqual({ calledBy: 'alice' })
  }, 10000)

  it('authenticates by a valid API key even when a stale session cookie is also present', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app-both', 'echoApp.js')
    await startBackendIfDeclared('echo-app-both')

    const staleCookie = `accessToken=${jwt.sign({ username: 'ghost', type: 'access' }, 'wrong-secret', { subject: 'x' })}`
    const response = await server.inject({
      method: 'GET',
      url: '/app-api/echo-app-both/whoami',
      headers: { authorization: `Bearer ${apiKey}`, cookie: staleCookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toEqual({ calledBy: 'keyowner' })
  }, 10000)

  it('returns 404 APP_BACKEND_ROUTE_NOT_FOUND for a path echoApp never registered', async () => {
    await installFixtureApp(appsStoragePath, 'echo-app-2', 'echoApp.js')
    await startBackendIfDeclared('echo-app-2')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/echo-app-2/does-not-exist',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_BACKEND_ROUTE_NOT_FOUND')
  }, 10000)

  it('returns 502 APP_BACKEND_CRASHED once crashingApp exhausts its one automatic restart', async () => {
    await installFixtureApp(appsStoragePath, 'crashing-app', 'crashingApp.js')
    await startBackendIfDeclared('crashing-app')

    await server.inject({ method: 'GET', url: '/app-api/crashing-app/crash', headers: cookieHeader() })
    const response = await server.inject({
      method: 'GET',
      url: '/app-api/crashing-app/crash',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(502)
    expect(response.json().error.errorCode).toBe('APP_BACKEND_CRASHED')
  }, 15000)

  it('returns 504 APP_BACKEND_TIMEOUT for slowApp', async () => {
    await installFixtureApp(appsStoragePath, 'slow-app', 'slowApp.js')
    process.env.APP_BACKEND_CALL_TIMEOUT_MS = '300'
    await startBackendIfDeclared('slow-app')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/slow-app/slow',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(504)
    expect(response.json().error.errorCode).toBe('APP_BACKEND_TIMEOUT')
  }, 10000)

  it('returns 502 APP_BACKEND_HANDLER_ERROR with a generic message for throwingApp', async () => {
    await installFixtureApp(appsStoragePath, 'throwing-app', 'throwingApp.js')
    await startBackendIfDeclared('throwing-app')

    const response = await server.inject({
      method: 'GET',
      url: '/app-api/throwing-app/throw',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(502)
    const body = response.json()
    expect(body.error.errorCode).toBe('APP_BACKEND_HANDLER_ERROR')
    expect(body.error.errorMessage).not.toContain('this internal detail should never reach the caller')
  }, 10000)
})
