import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard } from 'vuetify/components/VCard'
import { VProgressCircular } from 'vuetify/components/VProgressCircular'
import type { AssetIncomeSummary } from '../assetIncome'
import AssetIncomeCards from '../AssetIncomeCards.vue'

const vanguard: AssetIncomeSummary = {
  assetId: 'asset-1',
  name: 'Vanguard FTSE All-World',
  totalCents: 2000,
}

const flat: AssetIncomeSummary = {
  assetId: 'asset-2',
  name: 'Flat, Main Street 4',
  totalCents: 123456,
}

const untouched: AssetIncomeSummary = {
  assetId: 'asset-3',
  name: 'Bond ladder',
  totalCents: 0,
}

function mountCards(props: Record<string, unknown> = {}, below?: string) {
  return mount(AssetIncomeCards, {
    props: { summaries: [], loading: false, error: null, ...props },
    slots: below ? { default: below } : {},
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function cardsOf(wrapper: ReturnType<typeof mountCards>) {
  return wrapper.findAllComponents(VCard)
}

describe('AssetIncomeCards', () => {
  it('shows one card per asset', () => {
    expect(cardsOf(mountCards({ summaries: [vanguard, flat, untouched] }))).toHaveLength(3)
  })

  it('names the asset and states its cumulative income', () => {
    const card = cardsOf(mountCards({ summaries: [vanguard] }))[0]

    expect(card?.find('h2').text()).toBe('Vanguard FTSE All-World')
    expect(card?.text()).toContain('20,00 €')
  })

  it('shows an asset that has earned nothing at zero', () => {
    expect(cardsOf(mountCards({ summaries: [untouched] }))[0]?.text()).toContain('0,00 €')
  })

  it('writes a large total out in full, with a thousands separator', () => {
    const text = cardsOf(mountCards({ summaries: [flat] }))[0]?.text()

    expect(text).toContain('1.234,56 €')
  })

  it('puts nothing on the card but the name and the total', () => {
    const card = cardsOf(mountCards({ summaries: [vanguard] }))[0]
    const leftover = card
      ?.text()
      .replace('Vanguard FTSE All-World', '')
      .replace('20,00 €', '')
      .trim()

    expect(leftover).toBe('')
  })

  it('renders the cards in the order it is given, sorting nothing itself', () => {
    const names = cardsOf(mountCards({ summaries: [flat, untouched, vanguard] })).map((card) =>
      card.find('h2').text(),
    )

    expect(names).toEqual(['Flat, Main Street 4', 'Bond ladder', 'Vanguard FTSE All-World'])
  })

  it('lays the cards out as a grid rather than a table', () => {
    const wrapper = mountCards({ summaries: [vanguard, flat] })

    expect(wrapper.find('.v-row').exists()).toBe(true)
    expect(wrapper.findAll('.v-col-12')).toHaveLength(2)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('explains the empty case and points at the New Asset action', () => {
    const wrapper = mountCards()

    expect(wrapper.find('h2').text()).toBe('No assets yet')
    expect(wrapper.text()).toMatch(/New Asset/)
    expect(wrapper.find('.v-row').exists()).toBe(false)
    expect(cardsOf(wrapper)).toHaveLength(0)
  })

  it('shows a loading state instead of claiming there is nothing', () => {
    const wrapper = mountCards({ loading: true })

    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true)
    expect(wrapper.text()).not.toMatch(/no assets/i)
    expect(cardsOf(wrapper)).toHaveLength(0)
  })

  it('keeps showing the loading state even once summaries have arrived', () => {
    const wrapper = mountCards({ loading: true, summaries: [vanguard] })

    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true)
    expect(cardsOf(wrapper)).toHaveLength(0)
  })

  it('offers a retry when the data could not be loaded', async () => {
    const wrapper = mountCards({ error: 'The assets could not be loaded.' })

    expect(wrapper.text()).toContain('could not be loaded')
    expect(wrapper.text()).not.toMatch(/no assets/i)

    await wrapper.findComponent(VBtn).trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('announces a load failure rather than only showing it', () => {
    const wrapper = mountCards({ error: 'The assets could not be loaded.' })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('never mistakes a failed load for an empty account', () => {
    const wrapper = mountCards({ error: 'The assets could not be loaded.', summaries: [] })

    expect(wrapper.text()).not.toMatch(/no assets yet/i)
    expect(cardsOf(wrapper)).toHaveLength(0)
  })

  it('prefers the loading state over an error left from the previous attempt', () => {
    const wrapper = mountCards({ loading: true, error: 'The assets could not be loaded.' })

    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('keeps the retry reachable by keyboard', () => {
    const retry = mountCards({ error: 'Nope.' }).findComponent(VBtn)

    expect(retry.element.tagName).toBe('BUTTON')
    expect(retry.attributes('disabled')).toBeUndefined()
  })

  it('never leaves the area blank', () => {
    const states = [{}, { loading: true }, { error: 'Nope.' }, { summaries: [vanguard] }]

    for (const props of states) {
      expect(mountCards(props).text().trim()).not.toBe('')
    }
  })

  it('shows every total to the cent, never rounded away', () => {
    const cents = { ...vanguard, totalCents: 7 }

    expect(cardsOf(mountCards({ summaries: [cents] }))[0]?.text()).toContain('0,07 €')
  })

  it('leaves the app’s own heading the only h1 on the page', () => {
    expect(mountCards({ summaries: [vanguard, flat] }).findAll('h1')).toHaveLength(0)
  })
})

describe('AssetIncomeCards content below the cards', () => {
  const below = '<p class="below">Chart</p>'

  it('shows what it is given below the cards, after the grid', () => {
    const wrapper = mountCards({ summaries: [vanguard] }, below)
    const html = wrapper.html()

    expect(wrapper.find('.below').exists()).toBe(true)
    expect(html.indexOf('class="below"')).toBeGreaterThan(html.indexOf('role="list"'))
  })

  it('holds it back while loading, after a failure, and when there are no assets', () => {
    const states = [{ loading: true }, { error: 'Nope.' }, { summaries: [] }]

    for (const props of states) {
      expect(mountCards(props, below).find('.below').exists()).toBe(false)
    }
  })
})

describe('AssetIncomeCards layout and assistive technology', () => {
  const summaries = [vanguard, flat, untouched]

  it('gives every card one column on a phone and more as the screen widens', () => {
    const columns = mountCards({ summaries }).findAll('.v-col-12')

    expect(columns).toHaveLength(3)
    for (const column of columns) {
      expect(column.classes()).toContain('v-col-sm-6')
      expect(column.classes()).toContain('v-col-md-4')
      expect(column.classes()).toContain('v-col-lg-3')
    }
  })

  it('makes the cards in a row the same height however long the name is', () => {
    for (const card of cardsOf(mountCards({ summaries }))) {
      expect(card.classes()).toContain('h-100')
    }
  })

  it('presents the grid as a list so its length is announced', () => {
    const wrapper = mountCards({ summaries })

    expect(wrapper.find('.v-row').attributes('role')).toBe('list')
    expect(wrapper.findAll('[role="listitem"]')).toHaveLength(3)
  })

  it('reads each card as one name-and-total unit', () => {
    const wrapper = mountCards({ summaries: [vanguard] })
    const card = cardsOf(wrapper)[0]

    const labelId = card?.attributes('aria-labelledby')
    const describedId = card?.attributes('aria-describedby')

    expect(wrapper.find(`#${labelId}`).text()).toBe('Vanguard FTSE All-World')
    expect(wrapper.find(`#${describedId}`).text()).toBe('20,00 €')
  })

  it('labels each card with its own ids, never a neighbour’s', () => {
    const wrapper = mountCards({ summaries })
    const ids = cardsOf(wrapper).flatMap((card) => [
      card.attributes('aria-labelledby'),
      card.attributes('aria-describedby'),
    ])

    expect(ids.filter(Boolean)).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
  })

  // Feature 028 kept the cards out of the tab order because they did nothing. They now open the
  // asset's detail view, so they have to be real buttons instead.
  it('makes every card a button, so it is focusable and works with Enter and Space', () => {
    const wrapper = mountCards({ summaries })

    expect(wrapper.findAll('button')).toHaveLength(3)
    for (const card of cardsOf(wrapper)) {
      expect(card.element.tagName).toBe('BUTTON')
      expect(card.attributes('type')).toBe('button')
      expect(card.attributes('disabled')).toBeUndefined()
    }
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('asks for its asset to be opened rather than navigating itself', async () => {
    const wrapper = mountCards({ summaries })

    await cardsOf(wrapper)[1]?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['asset-2']])
  })

  it('opens the card the user activated, never a neighbour', async () => {
    const wrapper = mountCards({ summaries })

    for (const card of cardsOf(wrapper)) await card.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['asset-1'], ['asset-2'], ['asset-3']])
  })

  it('still reads each card as one name-and-total unit once it is a button', () => {
    const wrapper = mountCards({ summaries: [vanguard] })
    const card = cardsOf(wrapper)[0]

    expect(wrapper.find(`#${card?.attributes('aria-labelledby')}`).text()).toBe(
      'Vanguard FTSE All-World',
    )
    expect(wrapper.find(`#${card?.attributes('aria-describedby')}`).text()).toBe('20,00 €')
  })

  it('opens an asset that has earned nothing just like any other', async () => {
    const wrapper = mountCards({ summaries: [untouched] })

    await cardsOf(wrapper)[0]?.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['asset-3']])
  })

  it('keeps a very long name inside its own card, total and all', () => {
    const long = { ...vanguard, name: 'A'.repeat(120) }
    const wrapper = mountCards({ summaries: [long] })
    const card = cardsOf(wrapper)[0]

    expect(cardsOf(wrapper)).toHaveLength(1)
    expect(card?.find('h2').text()).toBe('A'.repeat(120))
    expect(card?.text()).toContain('20,00 €')
    expect(card?.find('.investment-income-card-name').exists()).toBe(true)
  })
})
