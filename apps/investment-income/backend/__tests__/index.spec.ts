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

const ownedAsset = {
  id: 'asset-1',
  userId: 'id-ada',
  name: 'Vanguard FTSE All-World',
  createdAt: '2026-09-12T10:14:05.213Z',
}

const validBody = { payoutDate: '2026-09-10', amountCents: 1250, assetId: 'asset-1' }

/** POST /entries checks the asset against the caller before storing, so storage must know it. */
function withOwnedAsset(appManager: ReturnType<typeof register>) {
  appManager.storage.query.mockResolvedValue([ownedAsset])
  return appManager
}

function postEntry(appManager: ReturnType<typeof register>) {
  return appManager.routes.find((route) => route.method === 'POST' && route.path === '/entries')
    ?.handler
}

describe('Investment Income backend — status', () => {
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

describe('Investment Income backend — POST /entries', () => {
  it('registers the route', () => {
    expect(postEntry(register())).toBeTypeOf('function')
  })

  it('stores the entry once, in the app’s entries collection', async () => {
    const appManager = withOwnedAsset(register())

    await postEntry(appManager)?.(contextFor('ada', validBody))

    expect(appManager.storage.store).toHaveBeenCalledTimes(1)
    expect(appManager.storage.store.mock.calls[0]?.[0]).toBe('entries')
  })

  it('returns the stored record the Hub assigned an id to', async () => {
    const appManager = withOwnedAsset(register())

    const stored = (await postEntry(appManager)?.(
      contextFor('ada', validBody),
    )) as StoredRecord

    expect(stored.id).toBe('entry-1')
    expect(stored).toMatchObject(validBody)
  })

  it('takes the owner from the authenticated caller', async () => {
    const appManager = withOwnedAsset(register())

    await postEntry(appManager)?.(contextFor('ada', validBody))

    expect(appManager.storage.store.mock.calls[0]?.[1]).toMatchObject({ userId: 'id-ada' })
  })

  it('ignores a userId supplied in the body', async () => {
    const appManager = withOwnedAsset(register())

    await expect(
      postEntry(appManager)?.(contextFor('ada', { ...validBody, userId: 'id-grace' })),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('stores exactly the payout, the amount, the asset, the owner and the instant', async () => {
    const appManager = withOwnedAsset(register())

    await postEntry(appManager)?.(contextFor('ada', validBody))

    expect(Object.keys(appManager.storage.store.mock.calls[0]?.[1] as object).sort()).toEqual([
      'amountCents',
      'assetId',
      'createdAt',
      'payoutDate',
      'userId',
    ])
  })

  it('stamps a creation instant itself', async () => {
    const appManager = withOwnedAsset(register())

    await postEntry(appManager)?.(contextFor('ada', validBody))
    const { createdAt } = appManager.storage.store.mock.calls[0]?.[1] as { createdAt: string }

    expect(new Date(createdAt).toISOString()).toBe(createdAt)
  })

  it('stores nothing when the asset is not the caller’s', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([])

    await expect(postEntry(appManager)?.(contextFor('ada', validBody))).rejects.toThrow(
      /not one of your assets/,
    )
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('looks the asset up against the caller, never against the body', async () => {
    const appManager = withOwnedAsset(register())

    await postEntry(appManager)?.(contextFor('ada', validBody))

    expect(appManager.storage.query).toHaveBeenCalledWith('assets', {
      userId: 'id-ada',
      id: 'asset-1',
    })
  })

  it('stores nothing when the body is invalid', async () => {
    const appManager = withOwnedAsset(register())

    await expect(
      postEntry(appManager)?.(contextFor('ada', { ...validBody, amountCents: 0 })),
    ).rejects.toThrow()
    await expect(
      postEntry(appManager)?.(contextFor('ada', { ...validBody, payoutDate: '2024-02-30' })),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('stores nothing when the body carries the holdings shape this app used to accept', async () => {
    const appManager = withOwnedAsset(register())

    await expect(
      postEntry(appManager)?.(
        contextFor('ada', {
          name: 'Krugerrand',
          categoryId: 'category-gold',
          locationId: 'location-1',
        }),
      ),
    ).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('propagates a storage failure rather than reporting a phantom save', async () => {
    const appManager = withOwnedAsset(register())
    appManager.storage.store.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(postEntry(appManager)?.(contextFor('ada', validBody))).rejects.toThrow()
  })
})

describe('Investment Income backend — GET /entries', () => {
  function getRoute(appManager: ReturnType<typeof register>) {
    return appManager.routes.find((route) => route.method === 'GET' && route.path === '/entries')
      ?.handler
  }

  const stored = (id: string, payoutDate: string, createdAt: string) => ({
    id,
    userId: 'id-ada',
    payoutDate,
    amountCents: 1250,
    assetId: 'asset-1',
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

  it('returns the most recent payout first', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([
      stored('last-month', '2026-08-13', '2026-09-13T10:00:00.000Z'),
      stored('today', '2026-09-13', '2026-09-13T09:00:00.000Z'),
      stored('last-week', '2026-09-06', '2026-09-13T11:00:00.000Z'),
    ])

    const result = (await getRoute(appManager)?.(contextFor('ada'))) as {
      entries: { id: string }[]
    }

    expect(result.entries.map((entry) => entry.id)).toEqual(['today', 'last-week', 'last-month'])
  })

  it('wraps the entries in an object per the response standards', async () => {
    const one = stored('one', '2026-09-10', '2026-09-13T09:00:00.000Z')
    const appManager = register()
    appManager.storage.query.mockResolvedValue([one])

    expect(await getRoute(appManager)?.(contextFor('ada'))).toEqual({ entries: [one] })
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

const validAsset = { name: 'Vanguard FTSE All-World' }

describe('Investment Income backend — POST /assets', () => {
  it('registers the route', () => {
    const routes = register().routes

    expect(routes.some((route) => route.method === 'POST' && route.path === '/assets')).toBe(true)
  })

  it('stores the asset once, in the app’s assets collection', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await post?.(contextFor('ada', validAsset))

    expect(appManager.storage.store).toHaveBeenCalledTimes(1)
    expect(appManager.storage.store.mock.calls[0]?.[0]).toBe('assets')
  })

  it('returns the stored record the Hub assigned an id to', async () => {
    const stored = (await routeFor('POST', '/assets')(contextFor('ada', validAsset))) as StoredRecord

    expect(stored.id).toBe('entry-1')
    expect(stored.name).toBe('Vanguard FTSE All-World')
  })

  it('takes the owner from the authenticated caller', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await post?.(contextFor('ada', validAsset))

    expect(appManager.storage.store.mock.calls[0]?.[1]).toMatchObject({ userId: 'id-ada' })
  })

  it('ignores a userId supplied in the body', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await expect(post?.(contextFor('ada', { ...validAsset, userId: 'id-grace' }))).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('stamps a creation instant itself', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await post?.(contextFor('ada', validAsset))
    const { createdAt } = appManager.storage.store.mock.calls[0]?.[1] as { createdAt: string }

    expect(new Date(createdAt).toISOString()).toBe(createdAt)
  })

  it('stores nothing when the body is invalid', async () => {
    const appManager = register()
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await expect(post?.(contextFor('ada', { name: '' }))).rejects.toThrow()
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('propagates a storage failure rather than reporting a phantom save', async () => {
    const appManager = register()
    appManager.storage.store.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))
    const post = appManager.routes.find((route) => route.path === '/assets')?.handler

    await expect(post?.(contextFor('ada', validAsset))).rejects.toThrow()
  })
})

describe('Investment Income backend — GET /assets', () => {
  function getRoute(appManager: ReturnType<typeof register>) {
    return appManager.routes.find((route) => route.method === 'GET' && route.path === '/assets')
      ?.handler
  }

  const stored = (id: string, createdAt: string) => ({
    id,
    userId: 'id-ada',
    name: `asset ${id}`,
    createdAt,
  })

  it('registers the route', () => {
    expect(getRoute(register())).toBeTypeOf('function')
  })

  it('asks storage only for the caller’s own assets', async () => {
    const appManager = register()

    await getRoute(appManager)?.(contextFor('ada'))

    expect(appManager.storage.query).toHaveBeenCalledWith('assets', { userId: 'id-ada' })
  })

  it('ignores any filter the caller tries to supply', async () => {
    const appManager = register()

    await getRoute(appManager)?.({
      user: { id: 'id-ada', username: 'ada' },
      query: { userId: 'id-grace' },
      body: { userId: 'id-grace' },
    })

    expect(appManager.storage.query).toHaveBeenCalledWith('assets', { userId: 'id-ada' })
  })

  it('returns the assets newest first', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([
      stored('older', '2026-09-10T09:00:00.000Z'),
      stored('newest', '2026-09-12T14:00:00.000Z'),
      stored('middle', '2026-09-11T09:00:00.000Z'),
    ])

    const result = (await getRoute(appManager)?.(contextFor('ada'))) as {
      assets: { id: string }[]
    }

    expect(result.assets.map((asset) => asset.id)).toEqual(['newest', 'middle', 'older'])
  })

  it('wraps the assets in an object per the response standards', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([stored('one', '2026-09-12T14:00:00.000Z')])

    expect(await getRoute(appManager)?.(contextFor('ada'))).toEqual({
      assets: [stored('one', '2026-09-12T14:00:00.000Z')],
    })
  })

  it('gives a user with no assets an empty list, not an error', async () => {
    expect(await getRoute(register())?.(contextFor('ada'))).toEqual({ assets: [] })
  })

  it('propagates a storage failure', async () => {
    const appManager = register()
    appManager.storage.query.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(getRoute(appManager)?.(contextFor('ada'))).rejects.toThrow()
  })
})

function toolFor(appManager: ReturnType<typeof register>, name: string): ToolDefinition {
  const found = appManager.tools.find((tool) => tool.name === name)

  if (!found) throw new Error(`no ${name} tool`)
  return found
}

function callTool(appManager: ReturnType<typeof register>, name: string, input: unknown) {
  return toolFor(appManager, name).handler({ user: { id: 'id-ada', username: 'ada' }, input })
}

describe('Investment Income backend — list-assets tool', () => {
  it('is declared read-only with an empty object schema', () => {
    const tool = toolFor(register(), 'list-assets')

    expect(tool.annotations).toEqual({ readOnlyHint: true })
    expect(tool.inputSchema).toEqual({ type: 'object', additionalProperties: false })
    expect(tool.description).toMatch(/assetId/)
  })

  it('asks storage only for the caller’s own assets', async () => {
    const appManager = register()

    await callTool(appManager, 'list-assets', {})

    expect(appManager.storage.query).toHaveBeenCalledWith('assets', { userId: 'id-ada' })
  })

  it('returns the caller’s assets wrapped like GET /assets', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([ownedAsset])

    expect(await callTool(appManager, 'list-assets', {})).toEqual({ assets: [ownedAsset] })
  })
})

describe('Investment Income backend — add-entry tool', () => {
  const input = { payoutDate: '2026-09-10', amount: 12.5, assetId: 'asset-1' }

  function tomorrow(): string {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + 1)
    return date.toISOString().slice(0, 10)
  }

  it('declares the three required inputs and no others', () => {
    const { inputSchema, annotations, description } = toolFor(register(), 'add-entry')
    const properties = inputSchema.properties as Record<string, Record<string, unknown>>

    expect(inputSchema.required).toEqual(['payoutDate', 'amount', 'assetId'])
    expect(inputSchema.additionalProperties).toBe(false)
    expect(properties.amount?.exclusiveMinimum).toBe(0)
    expect(properties.payoutDate?.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}$')
    expect(properties.assetId?.minLength).toBe(1)
    expect(annotations).toEqual({ destructiveHint: false })
    expect(description).toMatch(/YYYY-MM-DD/)
    expect(description).toMatch(/euros/)
    expect(description).toMatch(/list-assets/)
  })

  it('stores the payout in cents for the caller', async () => {
    const appManager = withOwnedAsset(register())

    const stored = (await callTool(appManager, 'add-entry', input)) as StoredRecord

    expect(appManager.storage.store).toHaveBeenCalledTimes(1)
    expect(appManager.storage.store.mock.calls[0]?.[0]).toBe('entries')
    expect(appManager.storage.store.mock.calls[0]?.[1]).toMatchObject({
      payoutDate: '2026-09-10',
      amountCents: 1250,
      assetId: 'asset-1',
      userId: 'id-ada',
    })
    expect(stored.id).toBe('entry-1')
  })

  it('checks the asset against the caller, not the input', async () => {
    const appManager = withOwnedAsset(register())

    await callTool(appManager, 'add-entry', input)

    expect(appManager.storage.query).toHaveBeenCalledWith('assets', {
      userId: 'id-ada',
      id: 'asset-1',
    })
  })

  it('reports a foreign or unknown asset as an error result and stores nothing', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([])

    const result = (await callTool(appManager, 'add-entry', input)) as { error: string }

    expect(result.error).toMatch(/assetId is not one of your assets/)
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('reports an amount finer than a cent as an error result', async () => {
    const appManager = withOwnedAsset(register())

    const result = (await callTool(appManager, 'add-entry', { ...input, amount: 12.505 })) as {
      error: string
    }

    expect(result.error).toMatch(/amount must have at most two decimals/)
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('reports a future payout date as an error result', async () => {
    const appManager = withOwnedAsset(register())

    const result = (await callTool(appManager, 'add-entry', {
      ...input,
      payoutDate: tomorrow(),
    })) as { error: string }

    expect(result.error).toMatch(/payoutDate/)
    expect(appManager.storage.store).not.toHaveBeenCalled()
  })

  it('lets a storage failure surface as a failed tool call, not a result', async () => {
    const appManager = withOwnedAsset(register())
    appManager.storage.store.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(callTool(appManager, 'add-entry', input)).rejects.toThrow()
  })
})

describe('Investment Income backend — DELETE /entries', () => {
  it('registers the route', () => {
    const route = register().routes.find((candidate) => candidate.path === '/entries' && candidate.method === 'DELETE')

    expect(route).toBeDefined()
  })

  it('deletes the entry named by the id query parameter', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([{ id: 'entry-1', userId: 'id-ada' }])
    const handler = appManager.routes.find(
      (route) => route.method === 'DELETE' && route.path === '/entries',
    )!.handler

    await handler({ user: { id: 'id-ada', username: 'ada' }, query: { id: 'entry-1' }, body: null })

    expect(appManager.storage.remove).toHaveBeenCalledWith('entries', 'entry-1')
  })

  it('takes the owner from the verified caller, never from the request', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([{ id: 'entry-1', userId: 'id-ada' }])
    const handler = appManager.routes.find(
      (route) => route.method === 'DELETE' && route.path === '/entries',
    )!.handler

    await expect(
      handler({
        user: { id: 'id-bob', username: 'bob' },
        query: { id: 'entry-1' },
        body: { userId: 'id-ada' },
      }),
    ).rejects.toThrow()
    expect(appManager.storage.remove).not.toHaveBeenCalled()
  })

  it('answers with the deleted id, an object the envelope can carry', async () => {
    const appManager = register()
    appManager.storage.query.mockResolvedValue([{ id: 'entry-1', userId: 'id-ada' }])
    const handler = appManager.routes.find(
      (route) => route.method === 'DELETE' && route.path === '/entries',
    )!.handler

    await expect(
      handler({ user: { id: 'id-ada', username: 'ada' }, query: { id: 'entry-1' }, body: null }),
    ).resolves.toEqual({ id: 'entry-1' })
  })

  it('leaves the other routes and the tools alone', () => {
    const appManager = register()

    expect(appManager.routes.map((route) => `${route.method} ${route.path}`)).toEqual([
      'GET /status',
      'POST /entries',
      'GET /entries',
      'POST /assets',
      'GET /assets',
      'DELETE /entries',
      'DELETE /assets',
    ])
    expect(appManager.tools.map((tool) => tool.name)).toEqual(['list-assets', 'add-entry'])
  })
})

describe('Investment Income backend — DELETE /assets', () => {
  function assetsRoute(appManager: ReturnType<typeof register>) {
    return appManager.routes.find((route) => route.method === 'DELETE' && route.path === '/assets')
  }

  it('registers the route', () => {
    expect(assetsRoute(register())).toBeDefined()
  })

  it('deletes the asset named by the id query parameter', async () => {
    const appManager = register()
    appManager.storage.query.mockImplementation(async (collection: string) =>
      collection === 'assets' ? [{ id: 'asset-1', userId: 'id-ada' }] : [],
    )

    const result = await assetsRoute(appManager)!.handler({
      user: { id: 'id-ada', username: 'ada' },
      query: { id: 'asset-1' },
      body: null,
    })

    expect(result).toEqual({ id: 'asset-1' })
    expect(appManager.storage.remove).toHaveBeenCalledWith('assets', 'asset-1')
  })

  it('takes the owner from the verified caller, never from the request', async () => {
    const appManager = register()
    appManager.storage.query.mockImplementation(async (collection: string) =>
      collection === 'assets' ? [{ id: 'asset-1', userId: 'id-ada' }] : [],
    )

    await expect(
      assetsRoute(appManager)!.handler({
        user: { id: 'id-bob', username: 'bob' },
        query: { id: 'asset-1' },
        body: { userId: 'id-ada' },
      }),
    ).rejects.toThrow()
    expect(appManager.storage.remove).not.toHaveBeenCalled()
  })
})
