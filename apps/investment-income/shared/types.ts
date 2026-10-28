export interface InvestmentIncomeEntry {
  /** Hub-assigned record id. */
  id: string
  /** Owning user, always taken from the Hub-verified caller */
  userId: string
  /** Calendar date without a time component, `YYYY-MM-DD` */
  payoutDate: string
  /** EUR as integer cents, greater than zero */
  amountCents: number
  /** Id of an asset owned by the same user */
  assetId: string
  /** ISO 8601 instant assigned by the backend on store */
  createdAt: string
}

export type NewEntryInput = Omit<InvestmentIncomeEntry, 'id' | 'userId' | 'createdAt'>

export interface InvestmentIncomeAsset {
  /** Hub-assigned record id. */
  id: string
  /** Owning user, always taken from the Hub-verified caller */
  userId: string
  name: string
  /** ISO 8601 instant assigned by the backend on store */
  createdAt: string
  /** Name under which this asset's income appears in bookings */
  bookingName?: string
}

export type NewAssetInput = Omit<InvestmentIncomeAsset, 'id' | 'userId' | 'createdAt'>
