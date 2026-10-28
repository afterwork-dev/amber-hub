export const CATEGORIES = [
  { value: 'commodities', title: 'Commodities' },
  { value: 'stocks', title: 'Stocks' },
  { value: 'bonds', title: 'Bonds' },
  { value: 'cash', title: 'Cash' },
  { value: 'real-estate', title: 'Real Estate' },
] as const

export type Category = (typeof CATEGORIES)[number]['value']

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category.value === value)
}
