import { describe, it, expect } from 'vitest'
import {
  ENTRY_CATEGORIES,
  findEntryCategoryEmoji,
  findEntryCategoryName,
  isKnownEntryCategoryId,
} from '../entry-categories'

describe('entry category catalog', () => {
  it('gives every category a unique, non-empty id', () => {
    const ids = ENTRY_CATEGORIES.map((category) => category.id)

    expect(ids.every((id) => id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every category a non-empty display name', () => {
    expect(ENTRY_CATEGORIES.every((category) => category.name.length > 0)).toBe(true)
  })

  it('offers the three categories the spec names, in order', () => {
    expect(ENTRY_CATEGORIES.map((category) => category.name)).toEqual([
      'Gold',
      'Collectible',
      'Inheritance',
    ])
  })

  it('is frozen so no consumer can extend the catalog at runtime', () => {
    expect(Object.isFrozen(ENTRY_CATEGORIES)).toBe(true)
  })

  it('resolves a known id to its current display name', () => {
    expect(findEntryCategoryName('category-gold')).toBe('Gold')
    expect(findEntryCategoryName('category-collectible')).toBe('Collectible')
    expect(findEntryCategoryName('category-inheritance')).toBe('Inheritance')
  })

  it('falls back to the raw id for an unknown category rather than throwing', () => {
    // Only reachable after a future catalog mistake — a stored entry must still display.
    expect(findEntryCategoryName('category-platinum')).toBe('category-platinum')
    expect(() => findEntryCategoryName('')).not.toThrow()
  })

  it('recognises exactly the catalog ids', () => {
    expect(isKnownEntryCategoryId('category-gold')).toBe(true)
    expect(isKnownEntryCategoryId('category-collectible')).toBe(true)
    expect(isKnownEntryCategoryId('category-inheritance')).toBe(true)
    expect(isKnownEntryCategoryId('category-platinum')).toBe(false)
    expect(isKnownEntryCategoryId('')).toBe(false)
    expect(isKnownEntryCategoryId('Gold')).toBe(false)
  })

  it('gives every category an emoji to be recognised by', () => {
    expect(ENTRY_CATEGORIES.every((category) => category.emoji.length > 0)).toBe(true)
  })

  it('resolves a known id to the emoji the spec assigns it', () => {
    expect(findEntryCategoryEmoji('category-gold')).toBe('🏦')
    expect(findEntryCategoryEmoji('category-collectible')).toBe('🪙')
    expect(findEntryCategoryEmoji('category-inheritance')).toBe('🪎')
  })

  it('gives no emoji for an unknown category rather than a stray id', () => {
    expect(findEntryCategoryEmoji('category-platinum')).toBeUndefined()
    expect(findEntryCategoryEmoji('')).toBeUndefined()
    expect(() => findEntryCategoryEmoji('category-platinum')).not.toThrow()
  })

  it('gives each category its own emoji', () => {
    const emojis = ENTRY_CATEGORIES.map((category) => category.emoji)

    expect(new Set(emojis).size).toBe(emojis.length)
  })
})
