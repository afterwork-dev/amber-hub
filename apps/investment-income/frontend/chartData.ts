import type { ChartData, ChartOptions } from 'chart.js'
import type { YearlyIncome } from './assetIncome'
import { GRID_COLOR, INCOME_COLOR } from './chartTheme'
import { formatEur, formatEurCompact } from './formatEntry'

export interface YearlyIncomeChart {
  data: ChartData<'bar'>
  options: ChartOptions<'bar'>
}

/** Chart.js plots euros; converting back keeps the tooltip exact to the cent. */
const eurosToCents = (euros: number): number => Math.round(euros * 100)

export function yearlyIncomeChart(years: YearlyIncome[]): YearlyIncomeChart {
  return {
    data: {
      labels: years.map((row) => String(row.year)),
      datasets: [
        {
          data: years.map((row) => row.totalCents / 100),
          backgroundColor: INCOME_COLOR,
          borderRadius: 4,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (item) => formatEur(eurosToCents(item.parsed.y ?? 0)) },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: GRID_COLOR },
          ticks: { callback: (value) => formatEurCompact(eurosToCents(Number(value))) },
        },
      },
    },
  }
}
