import type { Category } from '../shared/categories'

export const TEXT_COLOR = 'rgba(255, 255, 255, 0.7)'
export const GRID_COLOR = 'rgba(255, 255, 255, 0.12)'
export const FONT_FAMILY = 'Roboto, sans-serif'

export const NETWORTH_COLOR = '#FF8C00'
export const ASSETS_COLOR = '#66BB6A'
export const LIABILITIES_COLOR = '#EF5350'

export const CATEGORY_COLORS: Record<Category, string> = {
  commodities: '#42A5F5',
  stocks: '#66BB6A',
  bonds: '#AB47BC',
  cash: '#FF8C00',
  'real-estate': '#FFCA28',
}
