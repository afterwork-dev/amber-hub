import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VProgressCircular } from 'vuetify/components/VProgressCircular'
import type { TreasuryEntry } from '../../shared/types'
import EntryList from '../EntryList.vue'

const ROWS = 'tbody tr.v-data-table__tr'

const COLUMNS = ['Name', 'Serial No', 'Purchase Date', 'Purchase Value', 'Location']

const minimal: TreasuryEntry = {
  id: 'entry-1',
  userId: 'user-1',
  name: 'Gift coin',
  categoryId: 'category-inheritance',
  locationId: 'location-2',
  createdAt: '2026-08-12T14:03:22.147Z',
}

const full: TreasuryEntry = {
  ...minimal,
  id: 'entry-2',
  name: 'Krugerrand 1 oz',
  categoryId: 'category-gold',
  serialNo: 'K-2020-0042',
  purchaseDate: '2024-11-03',
  purchaseValueCents: 245050,
  locationId: 'location-1',
}

const collectible: TreasuryEntry = {
  ...minimal,
  id: 'entry-3',
  name: 'Ming Vase',
  categoryId: 'category-collectible',
}

const unknownCategory: TreasuryEntry = {
  ...minimal,
  id: 'entry-4',
  name: 'Mystery box',
  categoryId: 'category-platinum',
}

function mountList(props: Record<string, unknown> = {}) {
  return mount(EntryList, {
    props: { entries: [], loading: false, error: null, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function nameCellOf(wrapper: ReturnType<typeof mountList>, index = 0) {
  return wrapper.get(`${ROWS}:nth-child(${index + 1}) td:first-child`)
}

function filterButton(wrapper: ReturnType<typeof mountList>, label: string) {
  const button = wrapper
    .findAll('.treasury-filter button')
    .find((candidate) => candidate.text() === label)

  if (!button) throw new Error(`no filter button labelled ${label}`)

  return button
}

function rowNamesOf(wrapper: ReturnType<typeof mountList>) {
  return wrapper.findAll(ROWS).map((row) => row.findAll('td')[0]?.text())
}

function cellsOf(wrapper: ReturnType<typeof mountList>) {
  return wrapper.findAll(ROWS).map((row) => row.findAll('td').map((cell) => cell.text()))
}

describe('EntryList', () => {
  it('names every column in the order the spec fixes', () => {
    const headers = mountList({ entries: [full] })
      .findAll('thead th')
      .map((cell) => cell.text())

    expect(headers).toEqual(COLUMNS)
  })

  it('shows everything recorded about an entry, each value under its own column', () => {
    expect(cellsOf(mountList({ entries: [full] }))).toEqual([
      ['🏦Krugerrand 1 oz', 'K-2020-0042', '03.11.2024', '2.450,50 €', 'Location 1'],
    ])
  })

  it('leaves the cells of optional fields that were never filled in empty', () => {
    expect(cellsOf(mountList({ entries: [minimal] }))).toEqual([
      ['🪎Gift coin', '', '', '', 'Location 2'],
    ])
  })

  it('never fills an empty cell with a placeholder or a zero', () => {
    const text = mountList({ entries: [minimal] }).text()

    expect(text).not.toContain('—')
    expect(text).not.toContain('0,00 €')
  })

  it('shades alternating rows so one entry can be followed across the table', () => {
    const table = mountList({ entries: [minimal, full] }).find('.v-table')

    expect(table.classes()).toContain('v-table--striped-odd')
  })

  it('offers no sorting, so the given order is the shown order', () => {
    const wrapper = mountList({ entries: [full, minimal] })
    const sortable = wrapper
      .findAll('thead th')
      .filter((cell) => cell.classes().includes('v-data-table__th--sortable'))

    expect(sortable).toHaveLength(0)
    expect(cellsOf(wrapper).map((cells) => cells[0])).toEqual(['🏦Krugerrand 1 oz', '🪎Gift coin'])
  })

  it('lists every entry it is given', () => {
    expect(mountList({ entries: [full, minimal] }).findAll(ROWS)).toHaveLength(2)
  })

  it('explains the empty case and points at the New action', () => {
    const text = mountList().text()

    expect(text).toMatch(/no entries/i)
    expect(text).toMatch(/New/)
  })

  it('shows a loading state instead of claiming there is nothing', () => {
    const wrapper = mountList({ loading: true })

    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true)
    expect(wrapper.text()).not.toMatch(/no entries/i)
  })

  it('offers a retry when the entries could not be loaded', async () => {
    const wrapper = mountList({ error: 'The entries could not be loaded.' })

    expect(wrapper.text()).toContain('could not be loaded')
    expect(wrapper.text()).not.toMatch(/no entries/i)

    await wrapper.findComponent(VBtn).trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('announces a load failure rather than only showing it', () => {
    const wrapper = mountList({ error: 'The entries could not be loaded.' })

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('gives the empty state a heading below the app’s own', () => {
    expect(mountList().find('h2').text()).toBe('No entries yet')
  })

  it('keeps the retry reachable by keyboard', async () => {
    const retry = mountList({ error: 'Nope.' }).findComponent(VBtn)

    expect(retry.element.tagName).toBe('BUTTON')
    expect(retry.attributes('disabled')).toBeUndefined()
  })

  it('never leaves the area blank', () => {
    for (const props of [{}, { loading: true }, { error: 'Nope.' }, { entries: [minimal] }]) {
      expect(mountList(props).text().trim()).not.toBe('')
    }
  })

  it('marks each entry with the emoji of its own category', () => {
    const emojis = mountList({ entries: [full, collectible, minimal] })
      .findAll(ROWS)
      .map((row) => row.find('[role="img"]').text())

    expect(emojis).toEqual(['🏦', '🪙', '🪎'])
  })

  it('names the category for assistive technology instead of leaving a bare emoji', () => {
    const labels = mountList({ entries: [full, collectible, minimal] })
      .findAll(ROWS)
      .map((row) => row.find('[role="img"]').attributes('aria-label'))

    expect(labels).toEqual(['Gold', 'Collectible', 'Inheritance'])
  })

  it('puts the emoji before the name without altering the name itself', () => {
    const nameCell = nameCellOf(mountList({ entries: [full] }))

    expect(nameCell.text()).toBe('🏦Krugerrand 1 oz')
    expect(nameCell.find('[role="img"]').text()).toBe('🏦')
  })

  it('still lists an entry whose category is no longer defined, just without an emoji', () => {
    const wrapper = mountList({ entries: [unknownCategory] })

    expect(wrapper.findAll(ROWS)).toHaveLength(1)
    expect(nameCellOf(wrapper).find('[role="img"]').exists()).toBe(false)
    expect(nameCellOf(wrapper).text()).toBe('Mystery box')
  })

  it('offers a button for every category plus one for all entries', () => {
    const labels = mountList({ entries: [full] })
      .findAll('.treasury-filter button')
      .map((button) => button.text())

    expect(labels).toEqual(['All', 'Gold', 'Collectible', 'Inheritance'])
  })

  it('starts on all entries, with that shown as the active filter', () => {
    const wrapper = mountList({ entries: [full, collectible, minimal] })

    expect(filterButton(wrapper, 'All').attributes('aria-pressed')).toBe('true')
    expect(filterButton(wrapper, 'Gold').attributes('aria-pressed')).toBe('false')
    expect(wrapper.findAll(ROWS)).toHaveLength(3)
  })

  it('narrows the table to the chosen category', async () => {
    const wrapper = mountList({ entries: [full, collectible, minimal] })

    await filterButton(wrapper, 'Collectible').trigger('click')

    expect(rowNamesOf(wrapper)).toEqual(['🪙Ming Vase'])
  })

  it('moves the active state to the chosen category, not only its styling', async () => {
    const wrapper = mountList({ entries: [full, collectible] })

    await filterButton(wrapper, 'Gold').trigger('click')

    expect(filterButton(wrapper, 'Gold').attributes('aria-pressed')).toBe('true')
    expect(filterButton(wrapper, 'All').attributes('aria-pressed')).toBe('false')
  })

  it('brings every entry back when all entries is chosen again', async () => {
    const wrapper = mountList({ entries: [full, collectible, minimal] })

    await filterButton(wrapper, 'Gold').trigger('click')
    await filterButton(wrapper, 'All').trigger('click')

    expect(wrapper.findAll(ROWS)).toHaveLength(3)
  })

  it('shows an empty table body rather than an error when a category has no entries', async () => {
    const wrapper = mountList({ entries: [full] })

    await filterButton(wrapper, 'Inheritance').trigger('click')

    expect(wrapper.findAll(ROWS)).toHaveLength(0)
    expect(wrapper.findAll('thead th').map((cell) => cell.text())).toEqual(COLUMNS)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('lists an entry of an unknown category under all entries only', async () => {
    const wrapper = mountList({ entries: [unknownCategory] })

    expect(wrapper.findAll(ROWS)).toHaveLength(1)

    for (const label of ['Gold', 'Collectible', 'Inheritance']) {
      await filterButton(wrapper, label).trigger('click')
      expect(wrapper.findAll(ROWS)).toHaveLength(0)
    }
  })

  it('shows a newly saved entry only when it matches the active filter', async () => {
    const wrapper = mountList({ entries: [full] })

    await filterButton(wrapper, 'Gold').trigger('click')
    await wrapper.setProps({ entries: [collectible, full] })

    expect(rowNamesOf(wrapper)).toEqual(['🏦Krugerrand 1 oz'])

    await filterButton(wrapper, 'All').trigger('click')

    expect(rowNamesOf(wrapper)).toHaveLength(2)
  })

  it('keeps the filter buttons and the column headers visible when there are no entries yet', () => {
    const wrapper = mountList()

    expect(wrapper.findAll('.treasury-filter button')).toHaveLength(4)
    expect(wrapper.findAll('thead th').map((cell) => cell.text())).toEqual(COLUMNS)
    expect(wrapper.findAll(ROWS)).toHaveLength(0)
  })

  it('keeps every filter reachable by keyboard', () => {
    const buttons = mountList({ entries: [full] }).findAll('.treasury-filter button')

    expect(buttons).toHaveLength(4)

    for (const button of buttons) {
      expect(button.element.tagName).toBe('BUTTON')
      expect(button.attributes('disabled')).toBeUndefined()
    }
  })

  it('names the filter group for assistive technology', () => {
    const group = mountList({ entries: [full] }).find('.treasury-filter')

    expect(group.attributes('role')).toBe('group')
    expect(group.attributes('aria-label')).toBeTruthy()
  })

  it('gives the filter buttons a real height instead of collapsing them to their label', () => {
    const buttons = mountList({ entries: [full] }).findAll('.treasury-filter button')

    expect(buttons).toHaveLength(4)

    for (const button of buttons) {
      expect((button.element as HTMLElement).style.height).toBe('40px')
    }
  })
})
