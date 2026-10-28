import { describe, it, expect } from 'vitest'
import type { NetworthEntry } from '../../shared/types'
import { mergeByName, missingNames } from '../mergeEntries'

function stored(id: string, name: string, overrides: Partial<NetworthEntry> = {}): NetworthEntry {
  return {
    id,
    userId: 'id-ada',
    month: '2026-10',
    position: 0,
    name,
    category: 'cash',
    amountCents: 100000,
    quantity: 1,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

const savings = { name: 'Savings', category: 'cash' as const, amountCents: 500000, quantity: 1 }

describe('mergeByName', () => {
  it('keeps every existing entry and appends new names', () => {
    expect(mergeByName([stored('a', 'Main Account')], [savings])).toEqual([
      { id: 'a', name: 'Main Account', category: 'cash', amountCents: 100000, quantity: 1 },
      savings,
    ])
  })

  it('updates an existing entry by name, ignoring case, and keeps its id and spelling', () => {
    const merged = mergeByName(
      [stored('a', 'Main Account')],
      [{ name: 'main account', category: 'cash', amountCents: 123456, quantity: 1 }],
    )

    expect(merged).toEqual([
      { id: 'a', name: 'Main Account', category: 'cash', amountCents: 123456, quantity: 1 },
    ])
  })

  it('rejects the same name twice in one call', () => {
    expect(() => mergeByName([], [savings, { ...savings, name: ' savings ' }])).toThrow(
      /more than once/,
    )
  })

  it('rejects a month that would grow past the limit', () => {
    const existing = Array.from({ length: 100 }, (_, index) =>
      stored(`e${index}`, `Entry ${index}`),
    )

    expect(() => mergeByName(existing, [savings])).toThrow(/at most 100/)
  })
})

describe('missingNames', () => {
  it('names the previous month’s entries the current month does not have', () => {
    const previous = [stored('a', 'Main Account'), stored('b', 'Stocks'), stored('c', 'Mortgage')]

    expect(missingNames(previous, [stored('d', 'main account')])).toEqual(['Stocks', 'Mortgage'])
  })

  it('is empty without a previous month', () => {
    expect(missingNames([], [stored('a', 'Main Account')])).toEqual([])
  })
})
