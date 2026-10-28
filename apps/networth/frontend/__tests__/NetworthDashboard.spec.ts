import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import type { NetworthEntry } from '../../shared/types'
import NetworthDashboard from '../NetworthDashboard.vue'
import { ChartStub } from './chartStub'
import { entryFactory } from './entryFactory'

vi.mock('vue-chartjs', async () => (await import('./chartStub')).chartModule)

function mountDashboard(props: { entries?: NetworthEntry[]; loading?: boolean; error?: string }) {
  return mount(NetworthDashboard, {
    props: { entries: [], loading: false, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function charts(wrapper: ReturnType<typeof mountDashboard>) {
  return wrapper.findAllComponents(ChartStub)
}

const entries = [
  entryFactory({ month: '2026-09', name: 'Stocks', category: 'stocks', amountCents: 15800000 }),
  entryFactory({
    month: '2026-09',
    name: 'Gold',
    category: 'commodities',
    amountCents: 50000,
    quantity: 4,
  }),
  entryFactory({
    month: '2026-09',
    name: 'Mortgage',
    category: 'real-estate',
    amountCents: -12900000,
  }),
  entryFactory({ month: '2026-08', name: 'Stocks', category: 'stocks', amountCents: 15000000 }),
]

describe('NetworthDashboard', () => {
  it('shows that it is loading', () => {
    const wrapper = mountDashboard({ loading: true })

    expect(wrapper.text()).toContain('Loading your net worth…')
    expect(charts(wrapper)).toHaveLength(0)
  })

  it('shows a load failure with a way to retry', async () => {
    const wrapper = mountDashboard({ error: 'Your net worth could not be loaded.' })

    expect(wrapper.find('[role="alert"]').text()).toContain('could not be loaded')
    const retry = wrapper.findAllComponents(VBtn).find((btn) => btn.props('text') === 'Retry')
    await retry?.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('points at “New” when no month is recorded yet', () => {
    const wrapper = mountDashboard({})

    expect(wrapper.text()).toContain('No months recorded yet')
    expect(wrapper.text()).toContain('Select “New” to record your first month.')
  })

  it('summarises the latest month, liabilities included', () => {
    const [summary] = charts(mountDashboard({ entries }))

    expect(summary?.props('data').datasets[0].data).toEqual([31000, 160000, -129000])
    expect(summary?.props('ariaLabel')).toContain('Net worth 31.000,00')
  })

  it('shows the latest month’s assets by category, without liabilities', () => {
    const wrapper = mountDashboard({ entries })
    const assets = charts(wrapper)[1]

    expect(assets?.props('data').labels).toEqual(['Commodities', 'Stocks'])
    expect(assets?.props('data').datasets[0].data).toEqual([2000, 158000])
    expect(wrapper.text()).toContain('€160K')
    expect(wrapper.find('.networth-legend').text()).toContain('Stocks 98.8%')
  })

  it('says so when the latest month has no assets', () => {
    const wrapper = mountDashboard({
      entries: [entryFactory({ amountCents: -5000, name: 'Card' })],
    })

    expect(wrapper.text()).toContain('No assets recorded for this month.')
  })

  it('charts net worth over every month, oldest first', () => {
    const trend = charts(mountDashboard({ entries }))[2]

    expect(trend?.props('data').labels).toEqual(["Aug '26", "Sep '26"])
    expect(trend?.props('ariaLabel')).toBe(
      'Net worth from August 2026 (150.000,00 €) to September 2026 (31.000,00 €)',
    )
  })

  it('opens a month from the table', async () => {
    const wrapper = mountDashboard({ entries })

    const august = wrapper
      .findAllComponents(VBtn)
      .find((btn) => btn.props('text') === 'August 2026')
    await august?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['2026-08']])
  })
})
