import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import YearlyIncomeChart from '../YearlyIncomeChart.vue'
import { ChartStub } from './chartStub'

vi.mock('vue-chartjs', async () => (await import('./chartStub')).chartModule)

const years = [
  { year: 2025, totalCents: 1550 },
  { year: 2026, totalCents: 123456 },
]

function mountChart() {
  return mount(YearlyIncomeChart, {
    props: { years },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

describe('YearlyIncomeChart', () => {
  it('gives the chart a heading of its own, below the app’s h1', () => {
    const wrapper = mountChart()

    expect(wrapper.find('h2').text()).toBe('Income per year')
    expect(wrapper.findAll('h1')).toHaveLength(0)
  })

  it('hands the chart one bar per year', () => {
    const chart = mountChart().findComponent(ChartStub)

    expect(chart.props('data').labels).toEqual(['2025', '2026'])
  })

  it('reads every year’s total out to assistive technology', () => {
    const label = mountChart().find('canvas').attributes('aria-label')

    expect(label).toBe('Income per year: 2025 15,50 €, 2026 1.234,56 €')
  })
})
