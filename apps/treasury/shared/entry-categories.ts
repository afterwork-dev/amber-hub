export interface EntryCategory {
  id: string
  name: string
  emoji: string
}

export const ENTRY_CATEGORIES: readonly EntryCategory[] = Object.freeze([
  { id: 'category-gold', name: 'Gold', emoji: '🏦' },
  { id: 'category-collectible', name: 'Collectible', emoji: '🪙' },
  { id: 'category-inheritance', name: 'Inheritance', emoji: '🪎' },
])

export function isKnownEntryCategoryId(id: string): boolean {
  return ENTRY_CATEGORIES.some((category) => category.id === id)
}

export function findEntryCategoryName(id: string): string {
  return ENTRY_CATEGORIES.find((category) => category.id === id)?.name ?? id
}

export function findEntryCategoryEmoji(id: string): string | undefined {
  return ENTRY_CATEGORIES.find((category) => category.id === id)?.emoji
}
