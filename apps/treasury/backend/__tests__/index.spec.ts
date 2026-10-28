import { describe, it, expect, vi } from 'vitest'
import type {
  AppManager,
  AppRouteHandler,
  AppStorage,
  RouteContext,
  StoredRecord,
  ToolDefinition,
} from '@amber-hub/app-sdk/backend'
import init from '../index'
import manifest from '../../manifest.json'

interface Registration {
  method: string
  path: string
  handler: AppRouteHandler
}

type StorageMock = {
  [K in keyof AppStorage]: ReturnType<typeof vi.fn>
}

function createAppManager(): AppManager & {
  routes: Registration[]
  tools: ToolDefinition[]
  storage: StorageMock
} {
  const routes: Registration[] = []
  const tools: ToolDefinition[] = []
  const storage: StorageMock = {
    store: vi.fn(async (_collection: string, record: object) => ({
      id: 'entry-1',
      ...record,
    })) as unknown as ReturnType<typeof vi.fn>,
    query: vi.fn(async () => []) as unknown as ReturnType<typeof vi.fn>,
    remove: vi.fn(async () => undefined) as unknown as ReturnType<typeof vi.fn>,
  }

  return {
    routes,
    tools,
    storage: storage as unknown as AppStorage & StorageMock,
    registerRoute(method, path, handler) {
      routes.push({ method, path, handler: handler as AppRouteHandler })
    },
    registerTool(tool) {
      tools.push(tool as ToolDefinition)
    },
  } as AppManager & { routes: Registration[]; tools: ToolDefinition[]; storage: StorageMock }
}

function register() {
  const appManager = createAppManager()
  init(appManager)
  return appManager
}

function routeFor(method: string, path: string): AppRouteHandler {
  const found = register().routes.find((route) => route.method === method && route.path === path)

  if (!found) throw new Error(`no ${method} ${path} route`)
  return found.handler
}

function contextFor(username: string, body: unknown = {}): RouteContext {
  return {
    user: { id: `id-${username}`, username },
    query: { secret: 'should-be-ignored' },
    body,
  }
}

const validBody = { name: 'Krugerrand', categoryId: 'category-gold', locationId: 'location-1' }

describe('Treasury backend — status', () => {
  it('answers GET /status', () => {
    const route = register().routes.find((candidate) => candidate.path === '/status')

    expect(route?.method).toBe('GET')
  })

  it('reports availability and the app version', async () => {
    await expect(routeFor('GET', '/status')(contextFor('ada'))).toEqual({
      status: 'ok',
      version: manifest.version,
    })
  })

  it('returns nothing derived from the caller', async () => {
    const payload = await routeFor('GET', '/status')(contextFor('ada'))

    expect(Object.keys(payload as object).sort()).toEqual(['status', 'version'])
    expect(JSON.stringify(payload)).not.toContain('ada')
    expect(JSON.stringify(payload)).not.toContain('should-be-ignored')
  })

  it('answers identically for every caller — it is stateless', async () => {
    const first = await routeFor('GET', '/status')(contextFor('ada'))
    const second = await routeFor('GET', '/status')(contextFor('grace'))

    expect(first).toEqual(second)
  })

  it('reports the version the Hub actually serves', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('Treasury backend — POST /entries', () => {
  it('registers the route', () => {
    const routes = register().routes

    expect(routes.some((route) => route.method === 'POST' && route.path === '/entries')).toBe(true)
  })

  it('stores the entry once, in the app’s entries collection', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await post?.(contextFor('ada', validBody))

    expect(appManager.storage.store).toHaveBeenCalledTimes(1)
    expect(appManager.storage.store.mock.calls[0]?.[0]).toBe('entries')
  })

  it('returns the stored record the Hub assigned an id to', async () => {
    const stored = (await routeFor(
      'POST',
      '/entries',
    )(contextFor('ada', validBody))) as StoredRecord

    expect(stored.id).toBe('entry-1')
    expect(stored.name).toBe('Krugerrand')
  })

  it('takes the owner from the authenticated caller', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await post?.(contextFor('ada', validBody))

    expect(appManager.storage.store.mock.calls[0]?.[1]).toMatchObject({ userId: 'id-ada' })
  })

  it('ignores a userId supplied in the body', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await expect(post?.(contextFor('ada', { ...validBody, userId: 'id-grace' }))).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('passes the chosen category through to storage', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await post?.(contextFor('ada', { ...validBody, categoryId: 'category-collectible' }))

    expect(appManager.storage.store.mock.calls[0]?.[1]).toMatchObject({
      categoryId: 'category-collectible',
    })
  })

  it('stores nothing when the category is missing or unknown', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler
    const withoutCategory = { name: validBody.name, locationId: validBody.locationId }

    await expect(post?.(contextFor('ada', withoutCategory))).rejects.toThrow()
    await expect(
      post?.(contextFor('ada', { ...validBody, categoryId: 'category-platinum' })),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('stamps a creation instant itself', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await post?.(contextFor('ada', validBody))
    const { createdAt } = appManager.storage.store.mock.calls[0]?.[1] as { createdAt: string }

    expect(new Date(createdAt).toISOString()).toBe(createdAt)
  })

  it('stores absent optional fields as absent, not null', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await post?.(contextFor('ada', validBody))

    expect(Object.keys(appManager.storage.store.mock.calls[0]?.[1] as object).sort()).toEqual([
      'categoryId',
      'createdAt',
      'locationId',
      'name',
      'userId',
    ])
  })

  it('stores nothing when the body is invalid', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await expect(
      post?.(contextFor('ada', { name: '', locationId: 'location-1' })),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('propagates a storage failure rather than reporting a phantom save', async () => {
    const appManager = register()
    appManager.storage.store.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const post = appManager.routes.find((route) => route.path === '/entries')?.handler

    await expect(post?.(contextFor('ada', validBody))).rejects.toThrow()
  })
})

describe('Treasury backend — GET /entries', () => {
  function getRoute(appManager: ReturnType<typeof register>) {
    return appManager.routes.find((route) => route.method === 'GET' && route.path === '/entries')
      ?.handler
  }

  const stored = (id: string, createdAt: string) => ({
    id,
    userId: 'id-ada',
    name: `entry ${id}`,
    categoryId: 'category-gold',
    locationId: 'location-1',
    createdAt,
  })

  it('registers the route', () => {
    expect(getRoute(register())).toBeTypeOf('function')
  })

  it('asks storage only for the caller’s own entries', async () => {
    const appManager = register()

    await getRoute(appManager)?.(contextFor('ada'))

    expect(appManager.storage.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('ignores any filter the caller tries to supply', async () => {
    const appManager = register()

    await getRoute(appManager)?.({
      user: { id: 'id-ada', username: 'ada' },
      query: { userId: 'id-grace' },
      body: { userId: 'id-grace' },
    })

    expect(appManager.storage.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('returns the entries newest first', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([
      stored('older', '2026-08-10T09:00:00.000Z'),
      stored('newest', '2026-08-12T14:00:00.000Z'),
      stored('middle', '2026-08-11T09:00:00.000Z'),
    ])

    const result = (await getRoute(appManager)?.(contextFor('ada'))) as {
      entries: { id: string }[]
    }

    expect(result.entries.map((entry) => entry.id)).toEqual(['newest', 'middle', 'older'])
  })

  it('wraps the entries in an object per the response standards', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([stored('one', '2026-08-12T14:00:00.000Z')])

    expect(await getRoute(appManager)?.(contextFor('ada'))).toEqual({
      entries: [stored('one', '2026-08-12T14:00:00.000Z')],
    })
  })

  it('gives a user with no entries an empty list, not an error', async () => {
    expect(await getRoute(register())?.(contextFor('ada'))).toEqual({ entries: [] })
  })

  it('propagates a storage failure', async () => {
    const appManager = register()
    appManager.storage.query.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(getRoute(appManager)?.(contextFor('ada'))).rejects.toThrow()
  })
})

describe('Treasury backend — MCP tools', () => {
  it('publishes list-entries and add-entry', () => {
    expect(register().tools.map((tool) => tool.name)).toEqual(['list-entries', 'add-entry'])
  })
})
