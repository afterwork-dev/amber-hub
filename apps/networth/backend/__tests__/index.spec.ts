import { describe, it, expect, vi } from 'vitest'
import type {
  AppManager,
  AppRouteHandler,
  AppStorage,
  RouteContext,
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

function register() {
  const routes: Registration[] = []
  const storage: StorageMock = {
    store: vi.fn(async (_collection: string, record: object) => ({ id: 'entry-1', ...record })),
    query: vi.fn(async () => []),
    remove: vi.fn(async () => undefined),
  }
  const appManager = {
    routes,
    storage: storage as unknown as AppStorage & StorageMock,
    registerRoute(method: string, path: string, handler: AppRouteHandler) {
      routes.push({ method, path, handler })
    },
    registerTool: vi.fn(),
  }
  init(appManager as unknown as AppManager)
  return appManager
}

function routeFor(appManager: ReturnType<typeof register>, method: string, path: string) {
  const found = appManager.routes.find((route) => route.method === method && route.path === path)
  if (!found) throw new Error(`no ${method} ${path} route`)
  return found.handler
}

function contextFor(query: Record<string, string> = {}, body: unknown = {}): RouteContext {
  return { user: { id: 'id-ada', username: 'ada' }, query, body }
}

const gold = { name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 3 }

describe('Net Worth backend', () => {
  it('registers exactly its four routes', () => {
    expect(register().routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /status',
      'GET /entries',
      'PUT /months',
      'DELETE /months',
    ])
  })

  it('publishes its MCP tools', () => {
    expect(register().registerTool).toHaveBeenCalledTimes(2)
  })

  it('reports availability and the app version', async () => {
    const appManager = register()

    expect(await routeFor(appManager, 'GET', '/status')(contextFor())).toEqual({
      status: 'ok',
      version: manifest.version,
    })
  })

  it('lists the caller’s entries', async () => {
    const appManager = register()

    expect(await routeFor(appManager, 'GET', '/entries')(contextFor())).toEqual({ entries: [] })
    expect(appManager.storage.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('saves a month and returns its stored entries', async () => {
    const appManager = register()

    const result = await routeFor(
      appManager,
      'PUT',
      '/months',
    )(contextFor({ month: '2026-09' }, { entries: [gold] }))

    expect(result).toEqual({
      entries: [expect.objectContaining({ ...gold, month: '2026-09', userId: 'id-ada' })],
    })
  })

  it('takes the owner from the caller, never from the body', async () => {
    const appManager = register()

    await expect(
      routeFor(
        appManager,
        'PUT',
        '/months',
      )(contextFor({ month: '2026-09' }, { entries: [{ ...gold, userId: 'id-eve' }] })),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('deletes a month', async () => {
    const appManager = register()

    expect(
      await routeFor(appManager, 'DELETE', '/months')(contextFor({ month: '2026-09' })),
    ).toEqual({ month: '2026-09' })
  })
})
