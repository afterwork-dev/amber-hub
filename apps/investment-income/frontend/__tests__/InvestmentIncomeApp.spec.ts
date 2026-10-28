import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VSnackbar } from 'vuetify/components/VSnackbar'
import type { InvestmentIncomeAsset, InvestmentIncomeEntry } from '../../shared/types'
import AssetDetail from '../AssetDetail.vue'
import ConfirmDialog from '../ConfirmDialog.vue'
import AssetIncomeCards from '../AssetIncomeCards.vue'
import NewAssetDialog from '../NewAssetDialog.vue'
import NewEntryDialog from '../NewEntryDialog.vue'
import InvestmentIncomeApp from '../InvestmentIncomeApp.vue'
import YearlyIncomeChart from '../YearlyIncomeChart.vue'

vi.mock('vue-chartjs', async () => (await import('./chartStub')).chartModule)

const saveEntry = vi.fn()
const loadEntries = vi.fn()
const addEntry = vi.fn()
const saving = ref(false)
const saveError = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const entries = ref<InvestmentIncomeEntry[]>([])

const saveAsset = vi.fn()
const assetSaving = ref(false)
const assetSaveError = ref<string | null>(null)

const removeEntry = vi.fn()
const deleteEntry = vi.fn()
const deleting = ref(false)
const deleteError = ref<string | null>(null)

const removeEntriesForAsset = vi.fn()
const removeAsset = vi.fn()
const deleteAsset = vi.fn()
const deletingAsset = ref(false)
const deleteAssetError = ref<string | null>(null)

const loadAssets = vi.fn()
const addAsset = vi.fn()
const assets = ref<InvestmentIncomeAsset[]>([])
const assetsLoading = ref(false)
const assetsLoadError = ref<string | null>(null)

vi.mock('../useEntryList', () => ({
  useEntryList: () => ({
    entries,
    loading,
    error: loadError,
    loadEntries,
    addEntry,
    removeEntry,
    removeEntriesForAsset,
  }),
}))

vi.mock('../useDeleteEntry', () => ({
  useDeleteEntry: () => ({ deleting, error: deleteError, deleteEntry }),
}))

vi.mock('../useDeleteAsset', () => ({
  useDeleteAsset: () => ({ deleting: deletingAsset, error: deleteAssetError, deleteAsset }),
}))

vi.mock('../useSaveEntry', () => ({
  useSaveEntry: () => ({ saving, error: saveError, saveEntry }),
}))

vi.mock('../useSaveAsset', () => ({
  useSaveAsset: () => ({ saving: assetSaving, error: assetSaveError, saveAsset }),
}))

vi.mock('../useAssetList', () => ({
  useAssetList: () => ({
    assets,
    loading: assetsLoading,
    error: assetsLoadError,
    loadAssets,
    addAsset,
    removeAsset,
  }),
}))

const stored: InvestmentIncomeEntry = {
  id: 'entry-1',
  userId: 'user-1',
  payoutDate: '2026-09-10',
  amountCents: 1250,
  assetId: 'asset-1',
  createdAt: '2026-09-13T09:41:12.008Z',
}

const storedAsset: InvestmentIncomeAsset = {
  id: 'asset-1',
  userId: 'user-1',
  name: 'Vanguard FTSE All-World',
  createdAt: '2026-09-12T10:14:05.213Z',
}

const newEntry = { payoutDate: '2026-09-10', amountCents: 1250, assetId: 'asset-1' }
const newAsset = { name: 'Vanguard FTSE All-World' }

function createHost(): Element {
  return { getBoundingClientRect: () => ({ top: 200 }) } as unknown as Element
}

function setViewportHeight(height: number): void {
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true })
}

beforeEach(() => {
  setViewportHeight(1000)
  saveEntry.mockReset()
  saveEntry.mockResolvedValue(stored)
  loadEntries.mockReset()
  addEntry.mockReset()
  saveAsset.mockReset()
  saveAsset.mockResolvedValue(storedAsset)
  saving.value = false
  saveError.value = null
  assetSaving.value = false
  assetSaveError.value = null
  loading.value = false
  loadError.value = null
  entries.value = []
  removeEntry.mockReset()
  deleteEntry.mockReset()
  deleteEntry.mockResolvedValue(true)
  deleting.value = false
  deleteError.value = null
  removeEntriesForAsset.mockReset()
  removeAsset.mockReset()
  removeAsset.mockImplementation((id: string) => {
    assets.value = assets.value.filter((asset) => asset.id !== id)
  })
  deleteAsset.mockReset()
  deleteAsset.mockResolvedValue(true)
  deletingAsset.value = false
  deleteAssetError.value = null
  loadAssets.mockReset()
  addAsset.mockReset()
  assets.value = []
  assetsLoading.value = false
  assetsLoadError.value = null
})

function mountApp() {
  return mount(InvestmentIncomeApp, {
    props: { host: createHost() },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function headerButton(wrapper: ReturnType<typeof mountApp>, text: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === text)

  if (!found) throw new Error(`no header button labelled "${text}"`)
  return found
}

describe('InvestmentIncomeApp', () => {
  it('states the app name in a single top-level heading', () => {
    const headings = mountApp().findAll('h1')

    expect(headings).toHaveLength(1)
    expect(headings[0]?.text()).toBe('Investment Income')
  })

  it('renders exactly one header bar', () => {
    expect(mountApp().findAll('.v-toolbar')).toHaveLength(1)
  })

  it('puts nothing in the header but the name and the New Asset / New actions', () => {
    const wrapper = mountApp()

    expect(wrapper.findAll('.v-toolbar button').map((node) => node.text())).toEqual([
      'New Asset',
      'New',
    ])
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('renders exactly one content area', () => {
    expect(mountApp().findAll('.v-main')).toHaveLength(1)
  })

  it('sizes the shell to the space the Hub leaves below it', () => {
    const layout = mountApp().find('.v-layout')

    // Viewport 1000 minus the host's 200px top offset.
    expect(layout.attributes('style')).toContain('height: 800px')
  })

  it('re-sizes itself when the viewport changes', async () => {
    const layout = mountApp().find('.v-layout')
    expect(layout.attributes('style')).toContain('height: 800px')

    setViewportHeight(500)
    window.dispatchEvent(new Event('resize'))
    await nextTick()

    expect(layout.attributes('style')).toContain('height: 300px')
  })

  it('sets no fixed pixel width anywhere, so nothing can force horizontal overflow', () => {
    const withFixedWidth = mountApp()
      .findAll('*')
      .filter((node) => /(?<!-)\bwidth:\s*\d+px/.test(node.attributes('style') ?? ''))

    expect(withFixedWidth).toHaveLength(0)
  })

  it('presents New as a filled primary action', () => {
    const classes = headerButton(mountApp(), 'New').classes()

    expect(classes).toContain('bg-primary')
    expect(classes).toContain('v-btn--variant-flat')
  })

  it('presents New Asset as a secondary (outlined) primary-coloured action, left of New', () => {
    const wrapper = mountApp()
    const labels = wrapper.findAll('.v-toolbar button').map((node) => node.text())
    const classes = headerButton(wrapper, 'New Asset').classes()

    expect(labels.indexOf('New Asset')).toBeLessThan(labels.indexOf('New'))
    expect(classes).toContain('v-btn--variant-outlined')
    expect(classes).toContain('text-primary')
    expect(classes).not.toContain('bg-primary')
  })

  it('opens the entry dialog from the New action', async () => {
    const wrapper = mountApp()
    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(false)

    await headerButton(wrapper, 'New').trigger('click')

    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(NewAssetDialog).props('modelValue')).toBe(false)
  })

  it('opens the asset dialog from the New Asset action', async () => {
    const wrapper = mountApp()
    expect(wrapper.findComponent(NewAssetDialog).props('modelValue')).toBe(false)

    await headerButton(wrapper, 'New Asset').trigger('click')

    expect(wrapper.findComponent(NewAssetDialog).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(false)
  })

  it('saves the asset the dialog hands over', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()

    expect(saveAsset).toHaveBeenCalledWith(newAsset)
  })

  it('closes the asset dialog and confirms "Asset saved" once stored', async () => {
    const wrapper = mountApp()
    await headerButton(wrapper, 'New Asset').trigger('click')

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent(NewAssetDialog).props('modelValue')).toBe(false)
    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(true)

    await flushPromises()
    const contents = [...document.querySelectorAll('.v-snackbar__content')].map(
      (node) => node.textContent ?? '',
    )
    expect(contents.some((text) => text.includes('Asset saved'))).toBe(true)
  })

  it('keeps the asset dialog open and confirms nothing when its save fails', async () => {
    saveAsset.mockResolvedValue(null)
    assetSaveError.value = 'The asset could not be saved. Check your connection and try again.'
    const wrapper = mountApp()
    await headerButton(wrapper, 'New Asset').trigger('click')

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent(NewAssetDialog).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(NewAssetDialog).props('error')).toBe(assetSaveError.value)
    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(false)
  })

  it('drops a stale asset failure when the asset dialog is opened again', async () => {
    assetSaveError.value = 'The asset could not be saved. Check your connection and try again.'
    const wrapper = mountApp()

    await headerButton(wrapper, 'New Asset').trigger('click')

    expect(assetSaveError.value).toBeNull()
    expect(wrapper.findComponent(NewAssetDialog).props('error')).toBeNull()
  })

  it('tells the asset dialog when a save is in flight', () => {
    assetSaving.value = true

    expect(mountApp().findComponent(NewAssetDialog).props('saving')).toBe(true)
  })

  it('does not add anything to the entry list when an asset is saved', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(addEntry).not.toHaveBeenCalled()
  })

  it('saves the entry the dialog hands over', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()

    expect(saveEntry).toHaveBeenCalledWith(newEntry)
  })

  it('closes the dialog and confirms once the entry is stored', async () => {
    const wrapper = mountApp()
    await headerButton(wrapper, 'New').trigger('click')

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(false)
    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(true)
  })

  it('puts the stored entry straight into the list', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(addEntry).toHaveBeenCalledWith(stored)
    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('stores nothing and touches nothing when the dialog is cancelled', async () => {
    entries.value = [stored]
    const wrapper = mountApp()
    await headerButton(wrapper, 'New').trigger('click')
    loadEntries.mockClear()

    wrapper.findComponent(NewEntryDialog).vm.$emit('update:modelValue', false)
    await nextTick()

    expect(saveEntry).not.toHaveBeenCalled()
    expect(addEntry).not.toHaveBeenCalled()
    expect(loadEntries).not.toHaveBeenCalled()
    expect(entries.value).toEqual([stored])
    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(false)
  })

  it('tells the dialog when a save is in flight', async () => {
    saving.value = true

    expect(mountApp().findComponent(NewEntryDialog).props('saving')).toBe(true)
  })

  it('leaves the list alone when the save fails', async () => {
    saveEntry.mockResolvedValue(null)
    const wrapper = mountApp()

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(addEntry).not.toHaveBeenCalled()
  })

  it('asks for the user’s assets as well as their entries on arrival', () => {
    mountApp()

    expect(loadAssets).toHaveBeenCalledTimes(1)
    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('offers the loaded assets to the entry dialog', async () => {
    assets.value = [storedAsset]
    const wrapper = mountApp()

    expect(wrapper.findComponent(NewEntryDialog).props('assets')).toEqual([storedAsset])
  })

  it('sums the loaded entries onto their asset for the grid', () => {
    assets.value = [storedAsset]
    entries.value = [stored, { ...stored, id: 'entry-2', amountCents: 750 }]

    expect(mountApp().findComponent(AssetIncomeCards).props('summaries')).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 2000 },
    ])
  })

  it('shows an asset the user has never been paid by at zero', () => {
    assets.value = [storedAsset]
    entries.value = []

    expect(mountApp().findComponent(AssetIncomeCards).props('summaries')).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 0 },
    ])
  })

  it('passes a failed asset load on to the entry dialog', () => {
    assetsLoadError.value = 'The assets could not be loaded. Check your connection and try again.'

    expect(mountApp().findComponent(NewEntryDialog).props('assetsError')).toBe(
      assetsLoadError.value,
    )
  })

  it('reloads the assets when the dialog asks to retry', async () => {
    const wrapper = mountApp()
    loadAssets.mockClear()

    wrapper.findComponent(NewEntryDialog).vm.$emit('retry-assets')
    await nextTick()

    expect(loadAssets).toHaveBeenCalledTimes(1)
  })

  it('offers a newly saved asset without refetching', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(addAsset).toHaveBeenCalledWith(storedAsset)
    expect(loadAssets).toHaveBeenCalledTimes(1)
  })

  it('adds nothing to the asset list when the asset save fails', async () => {
    saveAsset.mockResolvedValue(null)
    const wrapper = mountApp()

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(addAsset).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and says nothing was saved when the save fails', async () => {
    saveEntry.mockResolvedValue(null)
    saveError.value = 'The entry could not be saved. Check your connection and try again.'
    const wrapper = mountApp()
    await headerButton(wrapper, 'New').trigger('click')

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(NewEntryDialog).props('error')).toBe(saveError.value)
    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(false)
  })

  it('drops a stale failure when the dialog is opened again', async () => {
    saveError.value = 'The entry could not be saved. Check your connection and try again.'
    const wrapper = mountApp()

    await headerButton(wrapper, 'New').trigger('click')

    expect(saveError.value).toBeNull()
    expect(wrapper.findComponent(NewEntryDialog).props('error')).toBeNull()
  })

  it('fills the content area with the asset cards', () => {
    const wrapper = mountApp()
    const cards = wrapper.findComponent(AssetIncomeCards)

    expect(cards.exists()).toBe(true)
    expect(wrapper.find('.v-main').element.contains(cards.element)).toBe(true)
  })

  it('charts the income per year below the cards', () => {
    assets.value = [storedAsset]
    entries.value = [stored, { ...stored, id: 'entry-2', payoutDate: '2024-02-01', amountCents: 750 }]

    const wrapper = mountApp()
    const chart = wrapper.findComponent(YearlyIncomeChart)

    expect(wrapper.findComponent(AssetIncomeCards).element.contains(chart.element)).toBe(true)
    expect(chart.props('years')).toEqual([
      { year: 2024, totalCents: 750 },
      { year: 2025, totalCents: 0 },
      { year: 2026, totalCents: 1250 },
    ])
  })

  it('draws no chart before the first payout', () => {
    assets.value = [storedAsset]
    entries.value = []

    expect(mountApp().findComponent(YearlyIncomeChart).exists()).toBe(false)
  })

  it('lists individual payouts nowhere any more', () => {
    entries.value = [stored]
    assets.value = [storedAsset]

    const wrapper = mountApp()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('10.09.2026')
  })

  it('loads the entries as soon as it is shown', () => {
    mountApp()

    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('holds the cards back until both collections have arrived', () => {
    const inFlight: [boolean, boolean][] = [
      [true, true],
      [true, false],
      [false, true],
    ]

    for (const [entriesInFlight, assetsInFlight] of inFlight) {
      loading.value = entriesInFlight
      assetsLoading.value = assetsInFlight

      expect(mountApp().findComponent(AssetIncomeCards).props('loading')).toBe(true)
    }

    loading.value = false
    assetsLoading.value = false

    expect(mountApp().findComponent(AssetIncomeCards).props('loading')).toBe(false)
  })

  it('reports a failed load once, whichever collection failed', () => {
    assetsLoadError.value = 'The assets could not be loaded.'

    expect(mountApp().findComponent(AssetIncomeCards).props('error')).toBe(
      'The assets could not be loaded.',
    )

    loadError.value = 'The entries could not be loaded.'

    expect(mountApp().findComponent(AssetIncomeCards).props('error')).toBe(
      'The entries could not be loaded.',
    )
  })

  it('reloads both collections when the grid asks to retry', async () => {
    const wrapper = mountApp()
    loadEntries.mockClear()
    loadAssets.mockClear()

    wrapper.findComponent(AssetIncomeCards).vm.$emit('retry')
    await nextTick()

    expect(loadEntries).toHaveBeenCalledTimes(1)
    expect(loadAssets).toHaveBeenCalledTimes(1)
  })

  it('raises the asset’s total as soon as an entry is saved, without refetching', async () => {
    assets.value = [storedAsset]
    addEntry.mockImplementation((entry: InvestmentIncomeEntry) => {
      entries.value = [entry, ...entries.value]
    })
    const wrapper = mountApp()
    const cards = wrapper.findComponent(AssetIncomeCards)
    expect(cards.props('summaries')[0]?.totalCents).toBe(0)

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(cards.props('summaries')[0]?.totalCents).toBe(1250)
    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('adds a card at zero as soon as an asset is saved, without refetching', async () => {
    addAsset.mockImplementation((asset: InvestmentIncomeAsset) => {
      assets.value = [asset, ...assets.value]
    })
    const wrapper = mountApp()
    const cards = wrapper.findComponent(AssetIncomeCards)
    expect(cards.props('summaries')).toEqual([])

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', newAsset)
    await nextTick()
    await nextTick()

    expect(cards.props('summaries')).toEqual([
      { assetId: 'asset-1', name: 'Vanguard FTSE All-World', totalCents: 0 },
    ])
    expect(loadAssets).toHaveBeenCalledTimes(1)
  })

  it('slots a newly saved asset into alphabetical order, not at the top', async () => {
    assets.value = [
      { ...storedAsset, id: 'asset-a', name: 'Amundi MSCI World' },
      { ...storedAsset, id: 'asset-z', name: 'Zebra Corp' },
    ]
    const middle = { ...storedAsset, id: 'asset-m', name: 'Rental Flat' }
    saveAsset.mockResolvedValue(middle)
    addAsset.mockImplementation((asset: InvestmentIncomeAsset) => {
      assets.value = [asset, ...assets.value]
    })
    const wrapper = mountApp()

    wrapper.findComponent(NewAssetDialog).vm.$emit('save', { name: 'Rental Flat' })
    await nextTick()
    await nextTick()

    const names = wrapper
      .findComponent(AssetIncomeCards)
      .props('summaries')
      .map((summary) => summary.name)

    expect(names).toEqual(['Amundi MSCI World', 'Rental Flat', 'Zebra Corp'])
  })

  it('moves no card when a payout changes an asset’s total', async () => {
    assets.value = [
      { ...storedAsset, id: 'asset-a', name: 'Amundi MSCI World' },
      { ...storedAsset, id: 'asset-1', name: 'Vanguard FTSE All-World' },
    ]
    addEntry.mockImplementation((entry: InvestmentIncomeEntry) => {
      entries.value = [entry, ...entries.value]
    })
    const wrapper = mountApp()
    const cards = wrapper.findComponent(AssetIncomeCards)
    const before = cards.props('summaries').map((summary) => summary.assetId)

    // The payout makes Vanguard the top earner; alphabetical order must not notice.
    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()
    await nextTick()

    expect(cards.props('summaries').map((summary) => summary.assetId)).toEqual(before)
    expect(before).toEqual(['asset-a', 'asset-1'])
    expect(cards.props('summaries')[1]?.totalCents).toBe(1250)
  })

  it('constrains the shell to its container rather than the viewport', () => {
    // A viewport-relative width would overflow the app region the Hub allocates.
    const viewportWidths = mountApp()
      .findAll('*')
      .filter((node) => /width:[^;]*\b\d+(vw|dvw)/.test(node.attributes('style') ?? ''))

    expect(viewportWidths).toHaveLength(0)
  })
})

describe('InvestmentIncomeApp detail view', () => {
  const amundi: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-a', name: 'Amundi MSCI World' }
  const vanguard: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-1' }

  const march: InvestmentIncomeEntry = { ...stored, id: 'e-3', payoutDate: '2026-03-01', amountCents: 1000, assetId: 'asset-a', createdAt: '2026-03-01T08:00:00.000Z' }
  const february: InvestmentIncomeEntry = { ...march, id: 'e-2', payoutDate: '2026-02-20', amountCents: 450, createdAt: '2026-02-20T08:00:00.000Z' }
  const january: InvestmentIncomeEntry = { ...march, id: 'e-1', payoutDate: '2026-01-15', amountCents: 550, createdAt: '2026-01-15T08:00:00.000Z' }
  const otherAsset: InvestmentIncomeEntry = { ...stored, id: 'e-other', assetId: 'asset-1', amountCents: 80000 }

  function openAmundi() {
    assets.value = [amundi, vanguard]
    entries.value = [march, february, january, otherAsset]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    return wrapper
  }

  it('shows the grid and no detail view until a card is opened', () => {
    assets.value = [amundi]
    const wrapper = mountApp()

    expect(wrapper.findComponent(AssetIncomeCards).exists()).toBe(true)
    expect(wrapper.findComponent(AssetDetail).exists()).toBe(false)
  })

  it('replaces the grid with the chosen asset’s detail view', async () => {
    const wrapper = openAmundi()
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
    expect(wrapper.findComponent(AssetIncomeCards).exists()).toBe(false)
  })

  it('puts the app’s own header away while the detail view is open', async () => {
    const wrapper = openAmundi()
    await nextTick()

    expect(wrapper.findAll('.v-toolbar')).toHaveLength(1)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('h1').text()).toBe('Amundi MSCI World')
    expect(wrapper.text()).not.toContain('New Asset')
  })

  it('names the opened asset rather than any other', async () => {
    const wrapper = openAmundi()
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).props('name')).toBe('Amundi MSCI World')
  })

  it('hands the detail view only that asset’s transactions', async () => {
    const wrapper = openAmundi()
    await nextTick()

    const ids = wrapper.findComponent(AssetDetail).props('transactions').map((entry) => entry.id)

    expect(ids).toEqual(['e-3', 'e-2', 'e-1'])
    expect(ids).not.toContain('e-other')
  })

  it('orders the transactions newest payout first', async () => {
    entries.value = []
    const wrapper = openAmundi()
    // Handed to the shell out of order on purpose: the shell, not the list, does the sorting.
    entries.value = [january, march, february]
    await nextTick()

    expect(
      wrapper.findComponent(AssetDetail).props('transactions').map((entry) => entry.payoutDate),
    ).toEqual(['2026-03-01', '2026-02-20', '2026-01-15'])
  })

  it('breaks a tie on the payout date by when the entry was recorded', async () => {
    const earlier = { ...march, id: 'e-first', createdAt: '2026-03-01T06:00:00.000Z' }
    const later = { ...march, id: 'e-second', createdAt: '2026-03-01T20:00:00.000Z' }
    assets.value = [amundi]
    entries.value = [earlier, later]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    await nextTick()

    expect(
      wrapper.findComponent(AssetDetail).props('transactions').map((entry) => entry.id),
    ).toEqual(['e-second', 'e-first'])
  })

  it('opens an asset with no payouts with an empty list', async () => {
    assets.value = [amundi, vanguard]
    entries.value = [otherAsset]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).props('transactions')).toEqual([])
    expect(wrapper.text()).toContain('No transactions yet')
  })

  it('returns to the grid, totals and all, when the user goes back', async () => {
    const wrapper = openAmundi()
    await nextTick()

    wrapper.findComponent(AssetDetail).vm.$emit('back')
    await nextTick()

    const cards = wrapper.findComponent(AssetIncomeCards)
    expect(cards.exists()).toBe(true)
    expect(wrapper.findComponent(AssetDetail).exists()).toBe(false)
    expect(cards.props('summaries').map((summary) => summary.totalCents)).toEqual([2000, 80000])
  })

  it('brings the app’s own header back with the grid', async () => {
    const wrapper = openAmundi()
    await nextTick()
    wrapper.findComponent(AssetDetail).vm.$emit('back')
    await nextTick()

    expect(wrapper.find('h1').text()).toBe('Investment Income')
    expect(wrapper.text()).toContain('New Asset')
  })

  it('opens whichever card the user picked', async () => {
    const wrapper = openAmundi()
    await nextTick()
    wrapper.findComponent(AssetDetail).vm.$emit('back')
    await nextTick()

    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-1')
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).props('name')).toBe('Vanguard FTSE All-World')
  })

  it('falls back to the grid if the opened asset is no longer there', async () => {
    const wrapper = openAmundi()
    await nextTick()

    assets.value = [vanguard]
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).exists()).toBe(false)
    expect(wrapper.findComponent(AssetIncomeCards).exists()).toBe(true)
  })
})

describe('InvestmentIncomeApp deleting a transaction', () => {
  const amundi: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-a', name: 'Amundi MSCI World' }
  const vanguard: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-1' }

  const march: InvestmentIncomeEntry = { ...stored, id: 'e-3', payoutDate: '2026-03-01', amountCents: 1000, assetId: 'asset-a', createdAt: '2026-03-01T08:00:00.000Z' }
  const february: InvestmentIncomeEntry = { ...march, id: 'e-2', payoutDate: '2026-02-20', amountCents: 450, createdAt: '2026-02-20T08:00:00.000Z' }
  const otherAsset: InvestmentIncomeEntry = { ...stored, id: 'e-other', assetId: 'asset-1', amountCents: 80000 }

  function openAmundi() {
    assets.value = [amundi, vanguard]
    entries.value = [march, february, otherAsset]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    return wrapper
  }

  function confirmDialog(wrapper: ReturnType<typeof mountApp>) {
    const found = wrapper
      .findAllComponents(ConfirmDialog)
      .find((candidate) => candidate.props('modelValue') === true)

    if (!found) throw new Error('no open confirmation dialog')
    return found
  }

  async function ask(wrapper: ReturnType<typeof mountApp>, entryId: string) {
    await nextTick()
    wrapper.findComponent(AssetDetail).vm.$emit('delete-transaction', entryId)
    await nextTick()
  }

  it('asks nothing until the user asks to delete', async () => {
    const wrapper = openAmundi()
    await nextTick()

    expect(
      wrapper.findAllComponents(ConfirmDialog).every((dialog) => !dialog.props('modelValue')),
    ).toBe(true)
  })

  it('confirms before deleting anything', async () => {
    const wrapper = openAmundi()

    await ask(wrapper, 'e-2')

    expect(confirmDialog(wrapper).exists()).toBe(true)
    expect(deleteEntry).not.toHaveBeenCalled()
    expect(removeEntry).not.toHaveBeenCalled()
  })

  it('names the payout it is about to delete, not just “this item”', async () => {
    const wrapper = openAmundi()

    await ask(wrapper, 'e-2')

    const message = confirmDialog(wrapper).props('message')
    expect(message).toContain('20.02.2026')
    expect(message).toContain('4,50 €')
    expect(message).toMatch(/cannot be undone/i)
  })

  it('changes nothing when the user backs out', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('update:modelValue', false)
    await nextTick()

    expect(deleteEntry).not.toHaveBeenCalled()
    expect(removeEntry).not.toHaveBeenCalled()
    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
  })

  it('deletes the confirmed payout and nothing else', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(deleteEntry).toHaveBeenCalledWith('e-2')
    expect(removeEntry).toHaveBeenCalledWith('e-2')
  })

  it('drops the payout from the list without a reload', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()
    entries.value = [march, otherAsset]
    await nextTick()

    expect(
      wrapper.findComponent(AssetDetail).props('transactions').map((entry) => entry.id),
    ).toEqual(['e-3'])
    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('lowers only that asset’s total', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')
    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()
    entries.value = [march, otherAsset]

    wrapper.findComponent(AssetDetail).vm.$emit('back')
    await nextTick()

    expect(
      wrapper.findComponent(AssetIncomeCards).props('summaries').map((summary) => summary.totalCents),
    ).toEqual([1000, 80000])
  })

  it('closes the confirmation once the payout is gone', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(
      wrapper.findAllComponents(ConfirmDialog).every((dialog) => !dialog.props('modelValue')),
    ).toBe(true)
  })

  it('confirms the deletion out loud, since the row simply vanishes', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(true)

    const contents = [...document.querySelectorAll('.v-snackbar__content')].map(
      (node) => node.textContent ?? '',
    )
    expect(contents.some((text) => text.includes('Transaction deleted'))).toBe(true)
  })

  it('leaves the asset in place with an empty list when its last payout goes', async () => {
    assets.value = [amundi]
    entries.value = [march]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    await ask(wrapper, 'e-3')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()
    entries.value = []
    await nextTick()

    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
    expect(wrapper.text()).toContain('No transactions yet')
  })

  it('keeps the payout and offers a retry when the deletion failed', async () => {
    // Mirrors the real composable: a failed delete reports false and leaves its message behind.
    deleteEntry.mockImplementation(async () => {
      deleteError.value = 'The transaction could not be deleted. Check your connection and try again.'
      return false
    })
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(removeEntry).not.toHaveBeenCalled()
    expect(confirmDialog(wrapper).props('error')).toMatch(/could not be deleted/)
  })

  it('asks nothing about a payout it no longer holds, having been deleted elsewhere', async () => {
    const wrapper = openAmundi()

    await ask(wrapper, 'e-deleted-in-another-tab')

    expect(
      wrapper.findAllComponents(ConfirmDialog).every((dialog) => !dialog.props('modelValue')),
    ).toBe(true)
    expect(deleteEntry).not.toHaveBeenCalled()
  })

  it('deletes nothing if a confirmation arrives with no payout pending', async () => {
    const wrapper = openAmundi()
    await nextTick()

    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm')
    await flushPromises()

    expect(deleteEntry).not.toHaveBeenCalled()
    expect(removeEntry).not.toHaveBeenCalled()
  })

  it('keeps the detail view open on a failed deletion, rather than dropping the user out', async () => {
    deleteEntry.mockResolvedValue(false)
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')

    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
    expect(confirmDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('says nothing about deletion after a failed attempt was retried', async () => {
    deleteError.value = 'The transaction could not be deleted. Check your connection and try again.'
    const wrapper = openAmundi()

    await ask(wrapper, 'e-2')

    expect(confirmDialog(wrapper).props('error')).toBeNull()
  })

  it('passes the in-flight state on, so the action cannot be fired twice', async () => {
    deleting.value = true
    const wrapper = openAmundi()

    await ask(wrapper, 'e-2')

    expect(confirmDialog(wrapper).props('busy')).toBe(true)
  })

  it('never lets a deletion reach the grid’s own actions', async () => {
    const wrapper = openAmundi()
    await ask(wrapper, 'e-2')
    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(saveEntry).not.toHaveBeenCalled()
    expect(saveAsset).not.toHaveBeenCalled()
  })
})

describe('InvestmentIncomeApp deleting an asset', () => {
  const amundi: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-a', name: 'Amundi MSCI World' }
  const vanguard: InvestmentIncomeAsset = { ...storedAsset, id: 'asset-1' }

  const march: InvestmentIncomeEntry = { ...stored, id: 'e-3', payoutDate: '2026-03-01', amountCents: 1000, assetId: 'asset-a', createdAt: '2026-03-01T08:00:00.000Z' }
  const february: InvestmentIncomeEntry = { ...march, id: 'e-2', payoutDate: '2026-02-20', amountCents: 450, createdAt: '2026-02-20T08:00:00.000Z' }
  const otherAsset: InvestmentIncomeEntry = { ...stored, id: 'e-other', assetId: 'asset-1', amountCents: 80000 }

  function openAmundi(list = [amundi, vanguard]) {
    assets.value = list
    entries.value = [march, february, otherAsset]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')
    return wrapper
  }

  function confirmDialog(wrapper: ReturnType<typeof mountApp>) {
    const found = wrapper
      .findAllComponents(ConfirmDialog)
      .find((candidate) => candidate.props('modelValue') === true)

    if (!found) throw new Error('no open confirmation dialog')
    return found
  }

  async function ask(wrapper: ReturnType<typeof mountApp>) {
    await nextTick()
    wrapper.findComponent(AssetDetail).vm.$emit('delete-asset')
    await nextTick()
  }

  async function confirm(wrapper: ReturnType<typeof mountApp>) {
    confirmDialog(wrapper).vm.$emit('confirm')
    await flushPromises()
  }

  it('confirms before deleting anything', async () => {
    const wrapper = openAmundi()

    await ask(wrapper)

    expect(confirmDialog(wrapper).exists()).toBe(true)
    expect(deleteAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
  })

  it('names the asset and how many transactions go with it', async () => {
    const wrapper = openAmundi()

    await ask(wrapper)

    const dialog = confirmDialog(wrapper)
    expect(dialog.props('title')).toMatch(/delete asset/i)
    expect(dialog.props('message')).toContain('Amundi MSCI World')
    expect(dialog.props('message')).toContain('2 transactions')
    expect(dialog.props('message')).toMatch(/cannot be undone/i)
  })

  it('uses the singular for a single transaction', async () => {
    assets.value = [amundi]
    entries.value = [march]
    const wrapper = mountApp()
    wrapper.findComponent(AssetIncomeCards).vm.$emit('select', 'asset-a')

    await ask(wrapper)

    expect(confirmDialog(wrapper).props('message')).toContain('1 transaction ')
  })

  it('keeps the detail view open with nothing removed when the user backs out', async () => {
    const wrapper = openAmundi()
    await ask(wrapper)

    confirmDialog(wrapper).vm.$emit('update:modelValue', false)
    await nextTick()

    expect(deleteAsset).not.toHaveBeenCalled()
    expect(removeAsset).not.toHaveBeenCalled()
    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
  })

  it('removes the asset and all of its entries locally, and only those', async () => {
    const wrapper = openAmundi()
    await ask(wrapper)

    await confirm(wrapper)

    expect(deleteAsset).toHaveBeenCalledWith('asset-a')
    expect(removeEntriesForAsset).toHaveBeenCalledWith('asset-a')
    expect(removeAsset).toHaveBeenCalledWith('asset-a')
  })

  it('returns to the grid without the deleted asset', async () => {
    const wrapper = openAmundi()
    await ask(wrapper)

    await confirm(wrapper)

    expect(wrapper.findComponent(AssetDetail).exists()).toBe(false)
    expect(wrapper.findComponent(AssetIncomeCards).props('summaries').map((s) => s.assetId)).toEqual(['asset-1'])
  })

  it('confirms the deletion out loud', async () => {
    const wrapper = openAmundi()
    await ask(wrapper)

    await confirm(wrapper)

    const contents = [...document.querySelectorAll('.v-snackbar__content')].map(
      (node) => node.textContent ?? '',
    )
    expect(contents.some((text) => text.includes('Asset deleted'))).toBe(true)
  })

  it('shows the empty state after the last asset is deleted', async () => {
    const wrapper = openAmundi([amundi])
    await ask(wrapper)

    await confirm(wrapper)

    expect(wrapper.text()).toContain('No assets yet')
  })

  it('leaves the detail view, the asset and its entries intact when the deletion failed', async () => {
    deleteAsset.mockImplementation(async () => {
      deleteAssetError.value = 'The asset could not be deleted. Check your connection and try again.'
      return false
    })
    const wrapper = openAmundi()
    await ask(wrapper)

    await confirm(wrapper)

    expect(removeAsset).not.toHaveBeenCalled()
    expect(removeEntriesForAsset).not.toHaveBeenCalled()
    expect(wrapper.findComponent(AssetDetail).exists()).toBe(true)
    expect(confirmDialog(wrapper).props('error')).toMatch(/could not be deleted/)
  })

  it('passes the in-flight state on, so the action cannot be fired twice', async () => {
    deletingAsset.value = true
    const wrapper = openAmundi()

    await ask(wrapper)

    expect(confirmDialog(wrapper).props('busy')).toBe(true)
  })

  it('deletes nothing if a confirmation arrives with no asset pending', async () => {
    const wrapper = openAmundi()
    await nextTick()

    wrapper.findAllComponents(ConfirmDialog).forEach((dialog) => dialog.vm.$emit('confirm'))
    await flushPromises()

    expect(deleteAsset).not.toHaveBeenCalled()
  })
})
