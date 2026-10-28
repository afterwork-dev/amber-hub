/**
 * Built once: constructing a collator per comparison is the documented slow path. The default
 * strength is what orders "bond" among the capitals and "ätna" beside "A"; `sensitivity: 'base'`
 * would instead call those equal. The locale is fixed so the order never depends on the machine.
 */
const collator = new Intl.Collator('de-DE')

/** Alphabetical, case-insensitive, accents beside their base letter. 0 when the names match. */
export function compareAssetNames(a: string, b: string): number {
  return collator.compare(a, b)
}
