import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../services/appBackends/__tests__/fixtures',
)
const ACCEPT = 'application/json, text/event-stream'

let mongod: MongoMemoryServer
let server: FastifyInstance
let disconnectMongo: (typeof import('../../../db/mongoClient'))['disconnectMongo']
let key: string
let userId: string
let sessionToken: string
let getBackendStatusForTests: (typeof import('../../../services/appBackends/appBackendManager'))['getBackendStatusForTests']
let resetAppBackendsForTests: (typeof import('../../../services/appBackends/appBackendManager'))['resetAppBackendsForTests']

async function installFixtureApp(appId: string, fixtureFile: string): Promise<void> {
  const appDir = join(storage.path, appId)
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

async function waitUntilRunning(appId: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (getBackendStatusForTests(appId)?.status === 'running') return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error(`Timed out waiting for "${appId}" to run`)
}

const rpc = (method: string, params?: Record<string, unknown>, id: unknown = 1) => ({
  jsonrpc: '2.0',
  id,
  method,
  ...(params ? { params } : {}),
})

function sseResult(body: string): Record<string, unknown> {
  const line = body.split('\n').find((l) => l.startsWith('data:'))
  if (!line) throw new Error(`no SSE data line in: ${body}`)
  return JSON.parse(line.slice('data:'.length).trim())
}

function post(payload: unknown, headers: Record<string, string> = {}) {
  return server.inject({
    method: 'POST',
    url: '/mcp',
    headers: { authorization: `Bearer ${key}`, accept: ACCEPT, ...headers },
    payload: payload as object,
  })
}

beforeAll(async () => {
  storage.path = await mkdtemp(join(tmpdir(), 'mcp-routes-'))
  mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-secret'

  const mongoClient = await import('../../../db/mongoClient')
  disconnectMongo = mongoClient.disconnectMongo
  await mongoClient.connectMongo()

  const apiKeyRepository = await import('../../../repositories/apiKey/apiKeyRepository')
  await apiKeyRepository.ensureIndexes()

  const userRepository = await import('../../../repositories/user/userRepository')
  const user = await userRepository.create({
    id: '',
    username: 'mcp-user',
    passwordHash: 'irrelevant',
    createdAt: new Date(),
  })
  userId = user.id

  const { issueAccessToken } = await import('../../../services/auth/tokenService')
  sessionToken = issueAccessToken(user).token

  const { createApiKey } = await import('../../../services/apiKeys/apiKeyService')
  key = (await createApiKey(user.id, { validityDays: 30 })).key

  const manager = await import('../../../services/appBackends/appBackendManager')
  getBackendStatusForTests = manager.getBackendStatusForTests
  resetAppBackendsForTests = manager.resetAppBackendsForTests
  await installFixtureApp('tool-app', 'toolApp.js')
  await manager.startBackendIfDeclared('tool-app')
  await waitUntilRunning('tool-app')

  const { buildServer } = await import('../../../buildServer')
  const { mcpRoutes } = await import('../mcp.routes')
  server = await buildServer()
  await server.register(mcpRoutes, { prefix: '/mcp' })
}, 60_000)

afterAll(async () => {
  resetAppBackendsForTests()
  await server.close()
  await disconnectMongo()
  await mongod.stop()
})

describe('authentication on /mcp', () => {
  const UNAUTHORIZED = {
    success: false,
    data: null,
    error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
  }

  it('accepts a valid API key', async () => {
    const response = await post(rpc('ping'))
    expect(response.statusCode).toBe(200)
    expect(sseResult(response.body).result).toEqual({})
  })

  it('rejects no credential, a JWT, a cookie, and a fabricated key identically', async () => {
    const none = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: { accept: ACCEPT },
      payload: rpc('ping'),
    })
    const jwt = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: { accept: ACCEPT, authorization: `Bearer ${sessionToken}` },
      payload: rpc('ping'),
    })
    const cookie = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: { accept: ACCEPT, cookie: `accessToken=${sessionToken}` },
      payload: rpc('ping'),
    })
    const fake = await server.inject({
      method: 'POST',
      url: '/mcp',
      headers: { accept: ACCEPT, authorization: 'Bearer ahk_never-issued' },
      payload: rpc('ping'),
    })
    for (const response of [none, jwt, cookie, fake]) {
      expect(response.statusCode).toBe(401)
      expect(response.json()).toEqual(UNAUTHORIZED)
    }
  })
})

describe('transport surface', () => {
  it('returns 405 for GET and DELETE', async () => {
    for (const method of ['GET', 'DELETE'] as const) {
      const response = await server.inject({
        method,
        url: '/mcp',
        headers: { authorization: `Bearer ${key}` },
      })
      expect(response.statusCode).toBe(405)
      expect(response.json().error.errorCode).toBe('METHOD_NOT_ALLOWED')
    }
  })

  it('rejects a foreign Origin with 403 but accepts the frontend Origin', async () => {
    const evil = await post(rpc('ping'), { origin: 'https://evil.example' })
    const ok = await post(rpc('ping'), { origin: 'http://localhost:5173' })
    expect(evil.statusCode).toBe(403)
    expect(evil.json().error.errorCode).toBe('FORBIDDEN')
    expect(ok.statusCode).toBe(200)
  })
})

describe('tools end to end', () => {
  it('lists the fixture tools under their presented names', async () => {
    const response = await post(rpc('tools/list'))
    const result = sseResult(response.body).result as { tools: Array<{ name: string }> }
    expect(result.tools.map((t) => t.name)).toContain('tool-app_whoami')
  })

  it('runs a tool as the API key owner', async () => {
    const response = await post(rpc('tools/call', { name: 'tool-app_whoami', arguments: {} }))
    expect(response.statusCode).toBe(200)
    const result = sseResult(response.body).result as {
      content: Array<{ text: string }>
      structuredContent: { calledBy: string }
    }
    expect(result.structuredContent).toEqual({ calledBy: 'mcp-user' })
    expect(result.content[0]?.text).toContain('mcp-user')
  })

  it('renders a throwing tool as an isError result without leaking the handler message', async () => {
    const response = await post(rpc('tools/call', { name: 'tool-app_fail', arguments: {} }))
    expect(response.statusCode).toBe(200)
    const result = sseResult(response.body).result as {
      isError: boolean
      content: Array<{ text: string }>
    }
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toBe('Tool tool-app_fail failed.')
    expect(response.body).not.toContain('internal tool detail that must not leak')
  })

  it('rejects the next request after the key is deleted', async () => {
    const apiKeyRepository = await import('../../../repositories/apiKey/apiKeyRepository')
    const { hashKey } = await import('../../../services/apiKeys/apiKeyService')
    const stored = await apiKeyRepository.findByKeyHash(hashKey(key))
    await apiKeyRepository.deleteByIdForUser(stored!.id, userId)

    const response = await post(rpc('ping'))
    expect(response.statusCode).toBe(401)
  })
})
