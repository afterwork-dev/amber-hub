import type { ChartData, ChartOptions } from 'chart.js'
import {
  ASSETS_COLOR,
  CATEGORY_COLORS,
  GRID_COLOR,
  LIABILITIES_COLOR,
  NETWORTH_COLOR,
} from './chartTheme'
import { formatEur, formatEurCompact } from './formatEur'
import { formatMonthShort } from './monthLabel'
import type { Totals } from '../shared/totals'
import type { CategoryTotal, MonthSummary } from './monthSummary'

interface Chart<T extends 'bar' | 'doughnut' | 'line'> {
  data: ChartData<T>
  options: ChartOptions<T>
}

const eurosToCents = (euros: number): number => Math.round(euros * 100)

const eurTooltip = {
  callbacks: {
    label: (item: { parsed: { y: number | null } }) => formatEur(eurosToCents(item.parsed.y ?? 0)),
  },
}

const eurAxis = {
  grid: { color: GRID_COLOR },
  ticks: { callback: (value: string | number) => formatEurCompact(eurosToCents(Number(value))) },
}

export function summaryChart(totals: Totals): Chart<'bar'> {
  const bars = [
    { label: 'Net worth', cents: totals.networthCents, color: NETWORTH_COLOR },
    { label: 'Assets', cents: totals.assetsCents, color: ASSETS_COLOR },
    { label: 'Liabilities', cents: totals.liabilitiesCents, color: LIABILITIES_COLOR },
  ]

  return {
    data: {
      labels: bars.map((bar) => [bar.label, formatEurCompact(bar.cents)]),
      datasets: [
        {
          data: bars.map((bar) => bar.cents / 100),
          backgroundColor: bars.map((bar) => bar.color),
          borderRadius: 4,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: eurTooltip },
      scales: { x: { grid: { display: false } }, y: eurAxis },
    },
  }
}

export function assetsChart(totals: CategoryTotal[]): Chart<'doughnut'> {
  return {
    data: {
      labels: totals.map((total) => total.title),
      datasets: [
        {
          data: totals.map((total) => total.valueCents / 100),
          backgroundColor: totals.map((total) => CATEGORY_COLORS[total.category]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '78%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (item) => formatEur(eurosToCents(item.parsed)) },
        },
      },
    },
  }
}

export function trendChart(summaries: MonthSummary[]): Chart<'line'> {
  const chronological = [...summaries].reverse()

  return {
    data: {
      labels: chronological.map((summary) => formatMonthShort(summary.month)),
      datasets: [
        {
          data: chronological.map((summary) => summary.networthCents / 100),
          borderColor: NETWORTH_COLOR,
          backgroundColor: 'rgba(255, 140, 0, 0.12)',
          fill: 'origin',
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: eurTooltip },
      scales: { x: { grid: { display: false } }, y: { ...eurAxis, beginAtZero: true } },
    },
  }
}
