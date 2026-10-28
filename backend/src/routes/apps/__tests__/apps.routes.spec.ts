import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import jwt from 'jsonwebtoken'
import { buildServer } from '../../../buildServer'
import { appsRoutes } from '../apps.routes'

// App storage has no environment override — it is a fixed, derived location. Tests isolate
// themselves by mocking the config module so each run points at its own temp directory.
const storage = vi.hoisted(() => ({ path: '' }))

vi.mock('../../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/env')>()
  return { ...actual, getAppsStoragePath: () => storage.path }
})


function authHeader(contentType: string): { authorization: string; 'content-type': string } {
  const token = jwt.sign({ username: 'alice', type: 'access' }, 'test-secret', { subject: 'user-1' })
  return { authorization: `Bearer ${token}`, 'content-type': contentType }
}

describe('GET /api/apps', () => {
  let server: FastifyInstance
  let appsStoragePath: string
  const originalJwtSecret = process.env.JWT_SECRET

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret'
    server = await buildServer()
    await server.register(appsRoutes, { prefix: '/api' })
  })

  afterAll(async () => {
    await server.close()
    process.env.JWT_SECRET = originalJwtSecret
  })

  beforeEach(async () => {
    appsStoragePath = await mkdtemp(join(tmpdir(), 'apps-routes-list-'))
    storage.path = appsStoragePath
  })

  afterEach(async () => {
    await rm(appsStoragePath, { recursive: true, force: true })
  })

  it('returns a 401 error envelope when no Authorization header is present', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/apps' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      success: false,
      data: null,
      error: { errorCode: 'UNAUTHORIZED', errorMessage: 'Authentication required' },
    })
  })

  it('returns 200 with an empty apps array when no apps are installed', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: authHeader('application/json'),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ success: true, data: { apps: [] }, error: null })
  })

  it('returns 200 with one entry per installed app', async () => {
    await mkdir(join(appsStoragePath, 'sample-app'), { recursive: true })
    await writeFile(
      join(appsStoragePath, 'sample-app', 'manifest.json'),
      JSON.stringify({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' }),
      'utf-8',
    )
    await mkdir(join(appsStoragePath, 'todo-list'), { recursive: true })
    await writeFile(
      join(appsStoragePath, 'todo-list', 'manifest.json'),
      JSON.stringify({ id: 'todo-list', displayName: 'To-Do List', version: '1.0.0' }),
      'utf-8',
    )

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: authHeader('application/json'),
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.apps).toEqual(
      expect.arrayContaining([
        { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
        { id: 'todo-list', displayName: 'To-Do List', frontend: null, backend: null },
      ]),
    )
    expect(body.data.apps).toHaveLength(2)
  })

  it('includes the frontend field per app, present vs. null', async () => {
    await mkdir(join(appsStoragePath, 'sample-app'), { recursive: true })
    await writeFile(
      join(appsStoragePath, 'sample-app', 'manifest.json'),
      JSON.stringify({ id: 'sample-app', displayName: 'Sample App', version: '1.0.0' }),
      'utf-8',
    )
    await mkdir(join(appsStoragePath, 'widget-app'), { recursive: true })
    await writeFile(
      join(appsStoragePath, 'widget-app', 'manifest.json'),
      JSON.stringify({
        id: 'widget-app',
        displayName: 'Widget App',
        version: '1.0.0',
        frontend: { entry: 'frontend/index.js' },
      }),
      'utf-8',
    )

    const response = await server.inject({
      method: 'GET',
      url: '/api/apps',
      headers: authHeader('application/json'),
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.apps).toEqual(
      expect.arrayContaining([
        { id: 'sample-app', displayName: 'Sample App', frontend: null, backend: null },
        {
          id: 'widget-app',
          displayName: 'Widget App',
          frontend: { entry: 'frontend/index.js' },
          backend: null,
        },
      ]),
    )
  })
})

