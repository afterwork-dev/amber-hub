import { describe, it, expect } from 'vitest'
import { LOCATIONS, findLocationName, isKnownLocationId } from '../locations'

describe('location catalog', () => {
  it('offers at least one location to choose from', () => {
    expect(LOCATIONS.length).toBeGreaterThan(0)
  })

  it('gives every location a unique, non-empty id', () => {
    const ids = LOCATIONS.map((location) => location.id)

    expect(ids.every((id) => id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every location a non-empty display name', () => {
    expect(LOCATIONS.every((location) => location.name.length > 0)).toBe(true)
  })

  it('offers the two locations the spec names, in order', () => {
    expect(LOCATIONS.map((location) => location.name)).toEqual(['Location 1', 'Location 2'])
  })

  it('resolves a known id to its current display name', () => {
    expect(findLocationName('location-1')).toBe('Location 1')
    expect(findLocationName('location-2')).toBe('Location 2')
  })

  it('falls back to the raw id for an unknown location rather than throwing', () => {
    // Only reachable after a future catalog mistake — a stored entry must still display.
    expect(findLocationName('location-99')).toBe('location-99')
    expect(() => findLocationName('')).not.toThrow()
  })

  it('recognises exactly the catalog ids', () => {
    expect(isKnownLocationId('location-1')).toBe(true)
    expect(isKnownLocationId('location-2')).toBe(true)
    expect(isKnownLocationId('location-99')).toBe(false)
    expect(isKnownLocationId('')).toBe(false)
    expect(isKnownLocationId('Location 1')).toBe(false)
  })
})
