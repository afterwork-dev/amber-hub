import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import { VLayout } from 'vuetify/components/VLayout'
import type { InvestmentIncomeEntry } from '../../shared/types'
import AssetDetail from '../AssetDetail.vue'

const march: InvestmentIncomeEntry = {
  id: 'entry-3',
  userId: 'user-1',
  payoutDate: '2026-03-01',
  amountCents: 1000,
  assetId: 'asset-1',
  createdAt: '2026-03-01T08:00:00.000Z',
}

const february: InvestmentIncomeEntry = {
  ...march,
  id: 'entry-2',
  payoutDate: '2026-02-20',
  amountCents: 450,
  createdAt: '2026-02-20T08:00:00.000Z',
}

const january: InvestmentIncomeEntry = {
  ...march,
  id: 'entry-1',
  payoutDate: '2026-01-15',
  amountCents: 550,
  createdAt: '2026-01-15T08:00:00.000Z',
}

// The bar and the content area are layout children, exactly as the app shell mounts them.
function mountDetail(props: Record<string, unknown> = {}) {
  return mount(VLayout, {
    global: { plugins: [createVuetify({ theme: false })] },
    slots: {
      default: () => h(AssetDetail, { name: 'Amundi MSCI World', transactions: [], ...props }),
    },
  })
}

function rowsOf(wrapper: ReturnType<typeof mountDetail>) {
  return wrapper.findAll('.v-list-item')
}

function backButton(wrapper: ReturnType<typeof mountDetail>) {
  return wrapper.get('[aria-label="Back to assets"]')
}

describe('AssetDetail bar', () => {
  it('names the asset in a single top-level heading', () => {
    const headings = mountDetail().findAll('h1')

    expect(headings).toHaveLength(1)
    expect(headings[0]?.text()).toBe('Amundi MSCI World')
  })

  it('renders exactly one bar, with a back button in it', () => {
    const wrapper = mountDetail()

    expect(wrapper.findAll('.v-toolbar')).toHaveLength(1)
    expect(backButton(wrapper).element.tagName).toBe('BUTTON')
  })

  it('asks to go back rather than navigating away itself', async () => {
    const wrapper = mountDetail({ transactions: [march] })

    await backButton(wrapper).trigger('click')

    expect(wrapper.findComponent(AssetDetail).emitted('back')).toHaveLength(1)
  })

  it('keeps a very long asset name inside the bar', () => {
    const wrapper = mountDetail({ name: 'A'.repeat(200) })

    expect(wrapper.find('h1').text()).toBe('A'.repeat(200))
    expect(wrapper.find('.investment-income-detail-name').exists()).toBe(true)
    expect(backButton(wrapper).element.tagName).toBe('BUTTON')
  })
})

describe('AssetDetail transaction list', () => {
  it('lists one row per transaction', () => {
    expect(rowsOf(mountDetail({ transactions: [march, february, january] }))).toHaveLength(3)
  })

  it('shows each transaction’s payout date and amount', () => {
    const row = rowsOf(mountDetail({ transactions: [march] }))[0]

    expect(row?.text()).toContain('01.03.2026')
    expect(row?.text()).toContain('10,00 €')
  })

  it('never repeats the asset name on a row', () => {
    const wrapper = mountDetail({ transactions: [march, february] })

    for (const row of rowsOf(wrapper)) {
      expect(row.text()).not.toContain('Amundi MSCI World')
    }
  })

  it('renders the rows in the order it is given, sorting nothing itself', () => {
    const wrapper = mountDetail({ transactions: [march, february, january] })

    const rows = rowsOf(wrapper).map((row) => [
      row.get('.v-list-item-title').text(),
      row.get('.v-list-item__append').text(),
    ])

    expect(rows).toEqual([
      ['01.03.2026', '10,00 €'],
      ['20.02.2026', '4,50 €'],
      ['15.01.2026', '5,50 €'],
    ])
  })

  it('shows an amount to the cent, never rounded away', () => {
    const cents = { ...march, amountCents: 7 }

    expect(rowsOf(mountDetail({ transactions: [cents] }))[0]?.text()).toContain('0,07 €')
  })

  it('writes a large amount out in full, with a thousands separator', () => {
    const large = { ...march, amountCents: 123456 }

    expect(rowsOf(mountDetail({ transactions: [large] }))[0]?.text()).toContain('1.234,56 €')
  })

  it('explains an asset that has no transactions yet', () => {
    const wrapper = mountDetail()

    expect(wrapper.find('h2').text()).toBe('No transactions yet')
    expect(rowsOf(wrapper)).toHaveLength(0)
    expect(wrapper.find('.v-list').exists()).toBe(false)
  })

  it('keeps the bar and its back button available on an empty asset', () => {
    const wrapper = mountDetail()

    expect(wrapper.find('h1').text()).toBe('Amundi MSCI World')
    expect(backButton(wrapper).element.tagName).toBe('BUTTON')
  })

  it('presents the transactions as a list so their number is announced', () => {
    const wrapper = mountDetail({ transactions: [march, february, january] })

    expect(wrapper.find('.v-list').attributes('role')).toBe('list')
    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(3)
  })

  it('leaves a row inert, since a transaction opens nothing', () => {
    const wrapper = mountDetail({ transactions: [march] })
    const row = rowsOf(wrapper)[0]

    expect(row?.element.tagName).toBe('DIV')
    expect(row?.classes()).not.toContain('v-list-item--link')
  })

  it('never leaves the area blank', () => {
    for (const props of [{}, { transactions: [march] }]) {
      expect(mountDetail(props).text().trim()).not.toBe('')
    }
  })

  it('scrolls the list inside the content area rather than the page', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({ ...march, id: `entry-${index}` }))
    const wrapper = mountDetail({ transactions: many })

    expect(rowsOf(wrapper)).toHaveLength(40)
    expect(wrapper.find('.investment-income-detail').exists()).toBe(true)
  })
})

describe('AssetDetail transaction actions', () => {
  // A menu's contents are an overlay, which Vuetify teleports out of the component's subtree.
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  function rowMenuButton(wrapper: ReturnType<typeof mountDetail>, index = 0) {
    const buttons = wrapper.findAll('.v-list-item button')

    const found = buttons[index]
    if (!found) throw new Error(`no actions button on row ${index}`)
    return found
  }

  it('offers actions on every transaction', () => {
    const wrapper = mountDetail({ transactions: [march, february, january] })

    expect(wrapper.findAll('.v-list-item button')).toHaveLength(3)
  })

  it('names the row an actions button belongs to, so it is not one of three “more” buttons', () => {
    const wrapper = mountDetail({ transactions: [march] })

    const label = rowMenuButton(wrapper).attributes('aria-label')
    expect(label).toContain('01.03.2026')
    expect(label).toContain('10,00 €')
  })

  it('gives every row its own distinguishable actions button', () => {
    const wrapper = mountDetail({ transactions: [march, february] })

    const labels = wrapper.findAll('.v-list-item button').map((node) => node.attributes('aria-label'))

    expect(new Set(labels).size).toBe(2)
  })

  it('keeps the actions button operable by keyboard', () => {
    const wrapper = mountDetail({ transactions: [march] })

    expect(rowMenuButton(wrapper).element.tagName).toBe('BUTTON')
  })

  it('hides the delete action until the menu is opened', () => {
    mountDetail({ transactions: [march] })

    expect(document.body.textContent).not.toContain('Delete')
  })

  it('offers deleting that transaction once the menu is open', async () => {
    const wrapper = mountDetail({ transactions: [march] })

    await rowMenuButton(wrapper).trigger('click')
    await nextTick()

    expect(document.body.textContent).toContain('Delete')
  })

  it('asks the shell to delete that one transaction, deleting nothing itself', async () => {
    const wrapper = mountDetail({ transactions: [march, february] })
    await rowMenuButton(wrapper, 1).trigger('click')
    await nextTick()

    document.querySelector<HTMLElement>('.v-overlay .v-list-item')?.click()
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).emitted('delete-transaction')).toEqual([['entry-2']])
  })

  it('leaves the row itself inert: only its menu acts', () => {
    const wrapper = mountDetail({ transactions: [march] })

    expect(rowsOf(wrapper)[0]?.classes()).not.toContain('v-list-item--link')
  })

  it('shows no actions when there is no transaction to act on', () => {
    expect(mountDetail().findAll('.v-list-item')).toHaveLength(0)
  })
})

describe('AssetDetail asset actions', () => {
  function assetMenuButton(wrapper: ReturnType<typeof mountDetail>) {
    return wrapper.get('[aria-label="Asset actions"]')
  }

  it('puts an asset actions button in the bar', () => {
    const wrapper = mountDetail()

    expect(wrapper.get('.v-toolbar').find('[aria-label="Asset actions"]').exists()).toBe(true)
  })

  it('keeps the asset action reachable when there are no transactions', () => {
    expect(mountDetail({ transactions: [] }).find('[aria-label="Asset actions"]').exists()).toBe(true)
  })

  it('hides the delete action until the menu is opened', () => {
    mountDetail()

    expect(document.body.textContent).not.toContain('Delete asset')
  })

  it('asks the shell to delete the asset, deleting nothing itself', async () => {
    const wrapper = mountDetail({ transactions: [march] })
    await assetMenuButton(wrapper).trigger('click')
    await nextTick()

    const item = [...document.querySelectorAll<HTMLElement>('.v-overlay .v-list-item')].find(
      (node) => node.textContent?.includes('Delete asset'),
    )
    item?.click()
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).emitted('delete-asset')).toHaveLength(1)
  })
})
