const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isValidMonth(value: string, today = new Date()): boolean {
  return MONTH.test(value) && value <= monthOf(today)
}

export function nextMonth(month: string): string {
  const [year = 0, monthNumber = 0] = month.split('-').map(Number)
  return monthOf(new Date(year, monthNumber, 1))
}
