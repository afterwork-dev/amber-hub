import { describe, it, expect } from 'vitest'
import { formatBackupSize } from '../formatBackup'

describe('formatBackupSize', () => {
  it.each([
    [null, '—'],
    [0, '0 B'],
    [512, '512 B'],
    [2048, '2.0 KB'],
    [1536, '1.5 KB'],
    [15 * 1024 * 1024, '15 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
  ])('formats %s as %s', (bytes, expected) => {
    expect(formatBackupSize(bytes)).toBe(expected)
  })
})
