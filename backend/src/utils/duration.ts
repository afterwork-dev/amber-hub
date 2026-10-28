const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
}

export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(duration.trim())
  if (!match) {
    return 0
  }
  const [, amount = '0', unit = 's'] = match
  return Number(amount) * UNIT_SECONDS[unit.toLowerCase()]!
}
