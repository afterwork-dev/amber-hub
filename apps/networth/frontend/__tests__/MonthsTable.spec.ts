import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import MonthsTable from '../MonthsTable.vue'

const ROWS = 'tbody tr.v-data-table__tr'

function mountTable() {
  return mount(MonthsTable, {
    props: {
      summaries: [
        {
          month: '2026-09',
          assetsCents: 22082253,
          liabilitiesCents: -12900825,
          networthCents: 9181428,
        },
        {
          month: '2026-08',
          assetsCents: 21731155,
          liabilitiesCents: -12950401,
          networthCents: 8780754,
        },
      ],
    },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

describe('MonthsTable', () => {
  it('lists every month with its totals', () => {
    const wrapper = mountTable()

    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Month',
      'Assets',
      'Liabilities',
      'Net worth',
    ])
    expect(
      wrapper
        .findAll(ROWS)[0]
        ?.findAll('td')
        .map((td) => td.text()),
    ).toEqual(['September 2026', '220.822,53 €', '-129.008,25 €', '91.814,28 €'])
  })

  it('opens a month by its labelled button', async () => {
    const wrapper = mountTable()
    const button = wrapper.find('[aria-label="Edit August 2026"]')

    await button.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['2026-08']])
  })
})
