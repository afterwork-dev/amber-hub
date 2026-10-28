import { describe, it, expect } from 'vitest'
import { parseDurationToSeconds } from '../duration'

describe('parseDurationToSeconds', () => {
  it('converts a seconds duration', () => {
    expect(parseDurationToSeconds('30s')).toBe(30)
  })

  it('converts a minutes duration', () => {
    expect(parseDurationToSeconds('15m')).toBe(15 * 60)
  })

  it('converts an hours duration', () => {
    expect(parseDurationToSeconds('2h')).toBe(2 * 60 * 60)
  })

  it('converts a days duration', () => {
    expect(parseDurationToSeconds('7d')).toBe(7 * 24 * 60 * 60)
  })

  it('returns 0 for an unparseable duration', () => {
    expect(parseDurationToSeconds('not-a-duration')).toBe(0)
  })
})
