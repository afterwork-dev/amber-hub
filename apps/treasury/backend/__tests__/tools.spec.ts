import { describe, it, expect, vi } from 'vitest'
import type {
  AppManager,
  AppStorage,
  ToolContext,
  ToolDefinition,
} from '@amber-hub/app-sdk/backend'
import { ENTRY_CATEGORIES } from '../../shared/entry-categories'
import { LOCATIONS } from '../../shared/locations'
import { registerTools } from '../tools'

type StorageMock = {
  [K in keyof AppStorage]: ReturnType<typeof vi.fn>
}

function setup() {
  const tools: ToolDefinition[] = []
  const storage: StorageMock = {
    store: vi.fn(async (_collection: string, record: object) => ({
      id: 'entry-1',
      ...record,
    })) as unknown as ReturnType<typeof vi.fn>,
    query: vi.fn(async () => []) as unknown as ReturnType<typeof vi.fn>,
    remove: vi.fn(async () => undefined) as unknown as ReturnType<typeof vi.fn>,
  }
  const appManager = {
    storage,
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

function call(tool: ToolDefinition, input: unknown, username = 'ada') {
  return tool.handler({ user: { id: `id-${username}`, username }, input } as ToolContext)
}

const stored = (id: string, createdAt: string) => ({
  id,
  userId: 'id-ada',
  name: `entry ${id}`,
  categoryId: 'category-gold',
  locationId: 'location-1',
  createdAt,
})

const validInput = { name: 'Krugerrand', categoryId: 'category-gold', locationId: 'location-1' }

describe('Treasury tools — list-entries', () => {
  it('is declared read-only with an optional, capped limit', () => {
    const { tool } = setup()

    expect(tool('list-entries').annotations).toEqual({ readOnlyHint: true })
    expect(tool('list-entries').inputSchema).toEqual({
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    })
  })

  it('asks storage only for the caller’s own entries', async () => {
    const { tool, storage } = setup()

    await call(tool('list-entries'), {})

    expect(storage.query).toHaveBeenCalledWith('entries', { userId: 'id-ada' })
  })

  it('returns the newest 20 entries when no limit is given', async () => {
    const { tool, storage } = setup()
    const records = Array.from({ length: 25 }, (_, index) =>
      stored(`e${index}`, new Date(Date.UTC(2026, 7, index + 1)).toISOString()),
    )
    storage.query.mockResolvedValue(records)

    const result = (await call(tool('list-entries'), {})) as { entries: { id: string }[] }

    expect(result.entries).toHaveLength(20)
    expect(result.entries[0]?.id).toBe('e24')
    expect(result.entries[19]?.id).toBe('e5')
  })

  it('honours a given limit', async () => {
    const { tool, storage } = setup()
    storage.query.mockResolvedValue([
      stored('older', '2026-08-10T09:00:00.000Z'),
      stored('newest', '2026-08-12T14:00:00.000Z'),
      stored('middle', '2026-08-11T09:00:00.000Z'),
    ])

    const result = (await call(tool('list-entries'), { limit: 2 })) as {
      entries: { id: string }[]
    }

    expect(result.entries.map((entry) => entry.id)).toEqual(['newest', 'middle'])
  })
})

describe('Treasury tools — add-entry', () => {
  it('is declared non-destructive with a closed schema built from the catalogs', () => {
    const { tool } = setup()
    const addEntry = tool('add-entry')
    const properties = addEntry.inputSchema.properties as Record<string, { enum?: string[] }>

    expect(addEntry.annotations).toEqual({ destructiveHint: false })
    expect(addEntry.inputSchema.required).toEqual(['name', 'categoryId', 'locationId'])
    expect(addEntry.inputSchema.additionalProperties).toBe(false)
    expect(properties.categoryId?.enum).toEqual(ENTRY_CATEGORIES.map((category) => category.id))
    expect(properties.locationId?.enum).toEqual(LOCATIONS.map((location) => location.id))
  })

  it('names every allowed category and location in its description', () => {
    const { description } = setup().tool('add-entry')

    for (const { id } of [...ENTRY_CATEGORIES, ...LOCATIONS]) {
      expect(description).toContain(id)
    }
  })

  it('stores the entry for the caller with a creation instant and returns it', async () => {
    const { tool, storage } = setup()

    const result = (await call(tool('add-entry'), validInput)) as { id: string }
    const [collection, record] = storage.store.mock.calls[0] as [string, { createdAt: string }]

    expect(result.id).toBe('entry-1')
    expect(collection).toBe('entries')
    expect(record).toMatchObject({ ...validInput, userId: 'id-ada' })
    expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt)
  })

  it('stores nothing when the input fails validation', async () => {
    const { tool, storage } = setup()

    await expect(
      call(tool('add-entry'), { ...validInput, categoryId: 'category-platinum' }),
    ).rejects.toThrow()
    await expect(
      call(tool('add-entry'), { ...validInput, purchaseDate: '2999-01-01' }),
    ).rejects.toThrow()
    expect(storage.store).not.toHaveBeenCalled()
  })

  it('propagates a storage failure', async () => {
    const { tool, storage } = setup()
    storage.store.mockRejectedValue(new Error('APP_STORAGE_UNAVAILABLE'))

    await expect(call(tool('add-entry'), validInput)).rejects.toThrow()
  })
})
