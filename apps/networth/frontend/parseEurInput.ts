export type ParsedEur = { valid: true; cents?: number } | { valid: false }

const INVALID: ParsedEur = { valid: false }

interface Split {
  euros: string
  decimals: string
  thousandsSeparator: string
}

/**
 * Decides which separator is the decimal one: a lone separator followed by exactly three digits
 * is a thousands group ("1.234"), so anything else makes the last separator decimal — "12,34"
 * and "12.34" both mean 12.34 €.
 */
function splitAmount(amount: string): Split | null {
  const lastDot = amount.lastIndexOf('.')
  const lastComma = amount.lastIndexOf(',')
  const separatorAt = Math.max(lastDot, lastComma)
  const trailing = separatorAt < 0 ? '' : amount.slice(separatorAt + 1)
  const bothUsed = lastDot >= 0 && lastComma >= 0

  if (separatorAt < 0) return { euros: amount, decimals: '', thousandsSeparator: '' }

  if (!bothUsed && trailing.length === 3) {
    return { euros: amount, decimals: '', thousandsSeparator: amount[separatorAt] ?? '' }
  }

  if (trailing.length === 0 || trailing.length > 2) return null

  return {
    euros: amount.slice(0, separatorAt),
    decimals: trailing.padEnd(2, '0'),
    thousandsSeparator: amount[separatorAt] === ',' ? '.' : ',',
  }
}

function eurosToCents(euros: string, thousandsSeparator: string): number | null {
  const grouped = thousandsSeparator !== '' && euros.includes(thousandsSeparator)
  const groups = grouped ? euros.split(thousandsSeparator) : [euros]
  const wellFormed = groups.every((group, index) => {
    if (!/^\d+$/.test(group)) return false
    if (groups.length === 1) return true
    return index === 0 ? group.length <= 3 : group.length === 3
  })

  return wellFormed ? Number(groups.join('')) * 100 : null
}

export function parseEurInput(raw: string): ParsedEur {
  const trimmed = raw.trim()
  if (trimmed === '') return { valid: true }

  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed
  if (!/^\d[\d.,]*$/.test(unsigned)) return INVALID

  const split = splitAmount(unsigned)
  if (split === null) return INVALID

  const euroCents = eurosToCents(split.euros, split.thousandsSeparator)
  if (euroCents === null) return INVALID

  const cents = euroCents + Number(split.decimals || 0)
  return { valid: true, cents: negative && cents !== 0 ? -cents : cents }
}
