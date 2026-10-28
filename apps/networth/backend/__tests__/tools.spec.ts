import { describe, it, expect, vi } from 'vitest'
import type {
  AppManager,
  AppStorage,
  StoredRecord,
  ToolContext,
  ToolDefinition,
} from '@amber-hub/app-sdk/backend'
import { registerTools } from '../tools'

function setup(stored: StoredRecord[] = []) {
  const tools: ToolDefinition[] = []
  let nextId = 1
  const storage = {
    store: vi.fn(async (_collection: string, record: Record<string, unknown>) => ({
      id: `new-${nextId++}`,
      ...record,
    })),
    query: vi.fn(async () => stored),
    remove: vi.fn(async () => undefined),
  }
  const appManager = {
    storage: storage as unknown as AppStorage,
    registerRoute: vi.fn(),
    registerTool(tool: ToolDefinition) {
      tools.push(tool)
    },
  } as unknown as AppManager

  registerTools(appManager)

  function tool(name: string): ToolDefinition {
    const found = tools.find((candidate) => candidate.name === name)
    if (!found) throw new Error(`no tool ${name}`)
    return found
  }

  return { tools, storage, tool }
}

function call(tool: ToolDefinition, input: unknown) {
  return tool.handler({ user: { id: 'id-ada', username: 'ada' }, input } as ToolContext)
}

function record(month: string, position: number, overrides: Partial<StoredRecord> = {}) {
  return {
    id: `${month}-${position}`,
    userId: 'id-ada',
    month,
    position,
    name: 'Main Account',
    category: 'cash',
    amountCents: 1200000,
    quantity: 1,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

const history = [
  record('2026-09', 0),
  record('2026-09', 1, {
    name: 'Gold 5g',
    category: 'commodities',
    amountCents: 50000,
    quantity: 3,
  }),
  record('2026-09', 2, { name: 'Mortgage', category: 'real-estate', amountCents: -12000000 }),
  record('2026-08', 0, { amountCents: 1100000 }),
  record('2026-07', 0, { amountCents: 1000000 }),
  record('2026-06', 0, { amountCents: 900000 }),
]

describe('Net Worth tools', () => {
  it('publishes a read-only list-months and an add-entries that may overwrite', () => {
    const { tools } = setup()

    expect(tools.map((tool) => [tool.name, tool.annotations])).toEqual([
      ['list-months', { readOnlyHint: true }],
      ['add-entries', { destructiveHint: true }],
    ])
  })

  it('tells the client to look up names first and to enter liabilities as negative amounts', () => {
    const description = setup().tool('add-entries').description

    expect(description).toMatch(/list-months first/)
    expect(description).toMatch(/negative/)
  })
})

describe('Net Worth tools — list-months', () => {
  it('returns the latest three months, newest first, in euros with totals', async () => {
    const result = (await call(setup(history).tool('list-months'), {})) as {
      months: { month: string }[]
    }

    expect(result.months.map((month) => month.month)).toEqual(['2026-09', '2026-08', '2026-07'])
    expect(result.months[0]).toEqual({
      month: '2026-09',
      assets: 13500,
      liabilities: -120000,
      networth: -106500,
      entries: [
        { name: 'Main Account', category: 'cash', amount: 12000, quantity: 1 },
        { name: 'Gold 5g', category: 'commodities', amount: 500, quantity: 3 },
        { name: 'Mortgage', category: 'real-estate', amount: -120000, quantity: 1 },
      ],
    })
  })

  it('honours the limit', async () => {
    const result = (await call(setup(history).tool('list-months'), { limit: 1 })) as {
      months: unknown[]
    }

    expect(result.months).toHaveLength(1)
  })

  it('asks storage only for the caller’s entries', async () => {
    const { storage, tool } = setup()

    await call(tool('list-months'), {})

    expect(storage.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })
})

describe('Net Worth tools — add-entries', () => {
  it('records a new month from euros and reports what the previous month had besides', async () => {
    const { storage, tool } = setup(history)

    const result = await call(tool('add-entries'), {
      month: '2026-10',
      entries: [
        { name: 'Main Account', category: 'cash', amount: 13500.5 },
        { name: 'Luxury Card', category: 'cash', amount: -812.4 },
      ],
    })

    expect(storage.store.mock.calls.map((call) => call[1])).toEqual([
      expect.objectContaining({ name: 'Main Account', amountCents: 1350050, quantity: 1 }),
      expect.objectContaining({ name: 'Luxury Card', amountCents: -81240, quantity: 1 }),
    ])
    expect(result).toEqual({
      month: '2026-10',
      assets: 13500.5,
      liabilities: -812.4,
      networth: 12688.1,
      entries: [
        { name: 'Main Account', category: 'cash', amount: 13500.5, quantity: 1 },
        { name: 'Luxury Card', category: 'cash', amount: -812.4, quantity: 1 },
      ],
      missingFromPreviousMonth: ['Gold 5g', 'Mortgage'],
    })
  })

  it('keeps a given quantity', async () => {
    const { storage, tool } = setup()

    await call(tool('add-entries'), {
      month: '2026-10',
      entries: [{ name: 'Gold 5g', category: 'commodities', amount: 520, quantity: 3 }],
    })

    expect(storage.store.mock.calls[0]?.[1]).toMatchObject({ amountCents: 52000, quantity: 3 })
  })

  it('answers invalid input with a message the client can correct, storing nothing', async () => {
    const { storage, tool } = setup(history)

    const result = (await call(tool('add-entries'), {
      month: '2026-10',
      entries: [{ name: 'Main Account', category: 'cash', amount: 12.345 }],
    })) as { error: string }

    expect(result.error).toMatch(/two decimals/)
    expect(storage.store).not.toHaveBeenCalled()
  })

  it('lets a storage failure propagate', async () => {
    const { storage, tool } = setup()
    storage.store.mockRejectedValueOnce(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(
      call(tool('add-entries'), {
        month: '2026-10',
        entries: [{ name: 'Main Account', category: 'cash', amount: 1 }],
      }),
    ).rejects.toThrow('APP_STORAGE_UNAVAILABLE')
  })
})
