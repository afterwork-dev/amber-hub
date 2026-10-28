import { describe, it, expect } from 'vitest'
import { compareEntries } from '../entryOrder'
import type { NetworthEntry } from '../types'

function entry(id: string, month: string, position: number): NetworthEntry {
  return {
    id,
    userId: 'user-1',
    month,
    position,
    name: id,
    category: 'cash',
    amountCents: 100,
    quantity: 1,
    createdAt: '2026-09-30T10:00:00.000Z',
  }
}

describe('compareEntries', () => {
  it('puts newer months first and keeps the order within a month', () => {
    const sorted = [entry('a', '2026-08', 0), entry('b', '2026-09', 1), entry('c', '2026-09', 0)]
      .sort(compareEntries)
      .map((e) => e.id)

    expect(sorted).toEqual(['c', 'b', 'a'])
  })
})
