import type { NetworthEntry } from '../../shared/types'

let lastId = 0

export function entryFactory(overrides: Partial<NetworthEntry> = {}): NetworthEntry {
  lastId += 1
  return {
    id: `entry-${lastId}`,
    userId: 'user-1',
    month: '2026-09',
    position: 0,
    name: 'Main Account',
    category: 'cash',
    amountCents: 100000,
    quantity: 1,
    createdAt: '2026-09-30T10:00:00.000Z',
    ...overrides,
  }
}
