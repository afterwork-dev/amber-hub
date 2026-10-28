import type { Category } from './categories'

export interface NetworthEntry {
  /** Hub-assigned record id. */
  id: string
  /** Owning user, always taken from the Hub-verified caller */
  userId: string
  /** Calendar month, `YYYY-MM` */
  month: string
  /** Order of the entry within its month */
  position: number
  name: string
  category: Category
  /** EUR per unit as integer cents, negative for liabilities */
  amountCents: number
  /** Multiplier applied to `amountCents`, greater than zero */
  quantity: number
  /** ISO 8601 instant assigned by the backend on store */
  createdAt: string
}

export interface MonthEntryInput {
  /** Present when the entry already exists */
  id?: string
  name: string
  category: Category
  amountCents: number
  quantity: number
}
