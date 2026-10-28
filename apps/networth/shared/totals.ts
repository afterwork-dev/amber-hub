export interface Totals {
  assetsCents: number
  /** Sum of the negative entry values, so never above zero */
  liabilitiesCents: number
  networthCents: number
}

export function totalsOf(valuesCents: number[]): Totals {
  const assetsCents = valuesCents.filter((value) => value > 0).reduce((sum, v) => sum + v, 0)
  const liabilitiesCents = valuesCents.filter((value) => value < 0).reduce((sum, v) => sum + v, 0)

  return { assetsCents, liabilitiesCents, networthCents: assetsCents + liabilitiesCents }
}
