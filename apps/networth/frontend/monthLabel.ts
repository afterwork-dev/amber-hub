const LONG = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const SHORT = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' })

function toDate(month: string): Date {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNumber - 1, 1))
}

export function formatMonth(month: string): string {
  return LONG.format(toDate(month))
}

export function formatMonthShort(month: string): string {
  return `${SHORT.format(toDate(month))} '${month.slice(2, 4)}`
}

const MONTH_NAME = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' })

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  title: MONTH_NAME.format(new Date(Date.UTC(2000, index, 1))),
}))
