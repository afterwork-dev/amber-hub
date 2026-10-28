export interface TreasuryEntry {
  /** Hub-assigned record id. */
  id: string
  /** Owning user, always taken from the Hub-verified caller */
  userId: string
  name: string
  /** Stable category id from the catalog */
  categoryId: string
  /** Stable location id from the catalog */
  locationId: string
  /** ISO 8601 instant assigned by the backend on store */
  createdAt: string
  serialNo?: string
  /** Calendar date without a time component, `YYYY-MM-DD` */
  purchaseDate?: string
  /** EUR as integer cents */
  purchaseValueCents?: number
}

export type NewEntryInput = Omit<TreasuryEntry, 'id' | 'userId' | 'createdAt'>
