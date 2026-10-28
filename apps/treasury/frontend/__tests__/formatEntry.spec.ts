import { describe, it, expect } from 'vitest'
import {
  formatEntryCategory,
  formatEntryCategoryEmoji,
  formatEur,
  formatLocation,
  formatPurchaseDate,
} from '../formatEntry'

describe('formatEur', () => {
  it('groups thousands and always shows two decimals', () => {
    expect(formatEur(123456)).toBe('1.234,56 €')
    expect(formatEur(1200)).toBe('12,00 €')
    expect(formatEur(123456789)).toBe('1.234.567,89 €')
  })

  it('shows zero as an amount, not as nothing', () => {
    expect(formatEur(0)).toBe('0,00 €')
  })

  it('pads a single cent digit', () => {
    expect(formatEur(7)).toBe('0,07 €')
    expect(formatEur(50)).toBe('0,50 €')
  })

  it('leaves an amount that was never entered empty', () => {
    expect(formatEur(undefined)).toBe('')
  })
})

describe('formatPurchaseDate', () => {
  it('shows a date the way it is written locally, with no time', () => {
    expect(formatPurchaseDate('2024-11-03')).toBe('03.11.2024')
    expect(formatPurchaseDate('2024-01-01')).toBe('01.01.2024')
  })

  it('leaves a date that was never entered empty', () => {
    expect(formatPurchaseDate(undefined)).toBe('')
  })
})

describe('formatLocation', () => {
  it('shows the location’s current display name', () => {
    expect(formatLocation('location-1')).toBe('Location 1')
    expect(formatLocation('location-2')).toBe('Location 2')
  })

  it('falls back to the stored id rather than showing nothing', () => {
    expect(formatLocation('location-99')).toBe('location-99')
  })
})

describe('formatEntryCategory', () => {
  it('shows the category’s current display name', () => {
    expect(formatEntryCategory('category-gold')).toBe('Gold')
    expect(formatEntryCategory('category-collectible')).toBe('Collectible')
    expect(formatEntryCategory('category-inheritance')).toBe('Inheritance')
  })

  it('falls back to the stored id rather than showing nothing', () => {
    expect(formatEntryCategory('category-platinum')).toBe('category-platinum')
  })
})

describe('formatEntryCategoryEmoji', () => {
  it('shows the emoji standing for the category', () => {
    expect(formatEntryCategoryEmoji('category-gold')).toBe('🏦')
    expect(formatEntryCategoryEmoji('category-collectible')).toBe('🪙')
    expect(formatEntryCategoryEmoji('category-inheritance')).toBe('🪎')
  })

  it('gives nothing for a category that is no longer defined', () => {
    expect(formatEntryCategoryEmoji('category-platinum')).toBeUndefined()
  })
})
