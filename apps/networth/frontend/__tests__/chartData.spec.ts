import { describe, it, expect } from 'vitest'
import { assetsChart, summaryChart, trendChart } from '../chartData'
import { CATEGORY_COLORS } from '../chartTheme'

type Callback = (...args: unknown[]) => unknown

describe('summaryChart', () => {
  const chart = summaryChart({
    assetsCents: 22082253,
    liabilitiesCents: -12900825,
    networthCents: 9181428,
  })

  it('shows net worth, assets and liabilities in euros, liabilities below zero', () => {
    expect(chart.data.datasets[0]?.data).toEqual([91814.28, 220822.53, -129008.25])
  })

  it('labels each bar with its compact value', () => {
    expect(chart.data.labels).toEqual([
      ['Net worth', '€92K'],
      ['Assets', '€221K'],
      ['Liabilities', '-€129K'],
    ])
  })

  it('shows full amounts in the tooltip and compact amounts on the axis', () => {
    const label = chart.options.plugins?.tooltip?.callbacks?.label as unknown as Callback
    const tick = chart.options.scales?.y?.ticks?.callback as unknown as Callback

    expect(label({ parsed: { y: -129008.25 } })).toBe('-129.008,25 €')
    expect(label({ parsed: { y: null } })).toBe('0,00 €')
    expect(tick(120000)).toBe('€120K')
  })
})

describe('assetsChart', () => {
  const chart = assetsChart([
    { category: 'stocks', title: 'Stocks', valueCents: 15800000 },
    { category: 'cash', title: 'Cash', valueCents: 3000000 },
  ])

  it('draws one slice per category in its colour', () => {
    expect(chart.data.labels).toEqual(['Stocks', 'Cash'])
    expect(chart.data.datasets[0]?.data).toEqual([158000, 30000])
    expect(chart.data.datasets[0]?.backgroundColor).toEqual([
      CATEGORY_COLORS.stocks,
      CATEGORY_COLORS.cash,
    ])
  })

  it('shows full amounts in the tooltip', () => {
    const label = chart.options.plugins?.tooltip?.callbacks?.label as unknown as Callback

    expect(label({ parsed: 158000 })).toBe('158.000,00 €')
  })
})

describe('trendChart', () => {
  it('runs from the oldest month to the newest', () => {
    const chart = trendChart([
      { month: '2026-09', assetsCents: 0, liabilitiesCents: 0, networthCents: 9181428 },
      { month: '2026-08', assetsCents: 0, liabilitiesCents: 0, networthCents: 8780754 },
    ])

    expect(chart.data.labels).toEqual(["Aug '26", "Sep '26"])
    expect(chart.data.datasets[0]?.data).toEqual([87807.54, 91814.28])
  })

  it('anchors the axis at zero, so a single month still gets a readable scale', () => {
    const chart = trendChart([
      { month: '2026-08', assetsCents: 0, liabilitiesCents: 0, networthCents: 4350000 },
    ])

    expect(chart.options.scales?.y).toMatchObject({ beginAtZero: true })
  })
})
