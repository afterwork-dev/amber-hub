import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import jwt from 'jsonwebtoken'
import { buildServer } from '../../../buildServer'
import { resourcesRoutes } from '../resources.routes'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


function cookieHeader(): { cookie: string } {
  const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', { subject: 'user-1' })
  return { cookie: `accessToken=${token}` }
}

describe('GET /resources/:appId/frontend/*', () => {
  let server: FastifyInstance
  let appsStoragePath: string
  const originalJwtSecret = process.env.JWT_SECRET

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret'
    server = await buildServer()
    await server.register(resourcesRoutes, { prefix: '/resources' })
  })

  afterAll(async () => {
    await server.close()
    process.env.JWT_SECRET = originalJwtSecret
  })

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'resources-routes-'))
    storage.path = appsStoragePath
    await mkdir(join(appsStoragePath, 'widget-app', 'frontend'), { recursive: true })
    await writeFile(
      join(appsStoragePath, 'widget-app', 'frontend', 'index.js'),
      'export function mount() {}',
      'utf-8',
    )
  })

  afterEach(async () => {
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('returns a 401 error envelope when no accessToken cookie is present', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/frontend/index.js',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.errorCode).toBe('UNAUTHORIZED')
  })

  it("returns 200 with the file's bytes and a text/javascript Content-Type for an existing file", async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/frontend/index.js',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('text/javascript')
    expect(response.body).toBe('export function mount() {}')
  })

  it('returns 404 APP_NOT_FOUND for an unknown appId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/resources/unknown-app/frontend/frontend/index.js',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_NOT_FOUND')
  })

  it('returns 404 APP_FILE_NOT_FOUND for a missing file under a known app', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/frontend/missing.js',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_FILE_NOT_FOUND')
  })

  it('returns 404 APP_FILE_NOT_FOUND for a wildcard path containing .. segments', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/resources/widget-app/frontend/..%2f..%2fmanifest.json',
      headers: cookieHeader(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.errorCode).toBe('APP_FILE_NOT_FOUND')
  })
})
