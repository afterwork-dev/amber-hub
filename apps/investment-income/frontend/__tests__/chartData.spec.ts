import { describe, it, expect } from 'vitest'
import { yearlyIncomeChart } from '../chartData'

const years = [
  { year: 2024, totalCents: 12345 },
  { year: 2025, totalCents: 0 },
  { year: 2026, totalCents: 250000 },
]

describe('yearlyIncomeChart', () => {
  it('draws one bar per year, labelled with the year, in the order given', () => {
    const { data } = yearlyIncomeChart(years)

    expect(data.labels).toEqual(['2024', '2025', '2026'])
    expect(data.datasets).toHaveLength(1)
    expect(data.datasets[0]?.data).toEqual([123.45, 0, 2500])
  })

  it('starts the value axis at zero, so bar heights compare honestly', () => {
    const y = yearlyIncomeChart(years).options.scales?.y as { beginAtZero?: boolean }

    expect(y.beginAtZero).toBe(true)
  })

  it('fills the width of its container rather than keeping an aspect ratio', () => {
    expect(yearlyIncomeChart(years).options.maintainAspectRatio).toBe(false)
  })

  it('states the exact year total in the tooltip', () => {
    const label = yearlyIncomeChart(years).options.plugins?.tooltip?.callbacks?.label as (
      item: unknown,
    ) => string

    expect(label({ parsed: { y: 123.45 } })).toBe('123,45 €')
  })

  it('writes axis ticks compactly', () => {
    const y = yearlyIncomeChart(years).options.scales?.y as {
      ticks: { callback: (value: number) => string }
    }

    expect(y.ticks.callback(2500)).toBe('€2.5K')
  })

  it('hides the legend, since there is only one series', () => {
    expect(yearlyIncomeChart(years).options.plugins?.legend?.display).toBe(false)
  })
})
