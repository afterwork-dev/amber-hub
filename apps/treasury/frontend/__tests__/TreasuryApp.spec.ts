import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VSnackbar } from 'vuetify/components/VSnackbar'
import type { TreasuryEntry } from '../../shared/types'
import EntryList from '../EntryList.vue'
import NewEntryDialog from '../NewEntryDialog.vue'
import TreasuryApp from '../TreasuryApp.vue'

const saveEntry = vi.fn()
const loadEntries = vi.fn()
const addEntry = vi.fn()
const saving = ref(false)
const saveError = ref<string | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const entries = ref<TreasuryEntry[]>([])

vi.mock('../useEntryList', () => ({
  useEntryList: () => ({ entries, loading, error: loadError, loadEntries, addEntry }),
}))

vi.mock('../useSaveEntry', () => ({
  useSaveEntry: () => ({ saving, error: saveError, saveEntry }),
}))

const stored: TreasuryEntry = {
  id: 'entry-1',
  userId: 'user-1',
  name: 'Krugerrand',
  categoryId: 'category-collectible',
  locationId: 'location-1',
  createdAt: '2026-08-12T14:03:22.147Z',
}

const newEntry = { name: 'Krugerrand', locationId: 'location-1' }

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
  saving.value = false
  saveError.value = null
  loading.value = false
  loadError.value = null
  entries.value = []
})

function mountApp() {
  return mount(TreasuryApp, {
    props: { host: createHost() },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

describe('TreasuryApp', () => {
  it('states the app name in a single top-level heading', () => {
    const headings = mountApp().findAll('h1')

    expect(headings).toHaveLength(1)
    expect(headings[0]?.text()).toBe('Treasury')
  })

  it('renders exactly one header bar', () => {
    expect(mountApp().findAll('.v-toolbar')).toHaveLength(1)
  })

  it('puts nothing in the header but the name and the New action', () => {
    const wrapper = mountApp()

    expect(wrapper.findAll('.v-toolbar button').map((node) => node.text())).toEqual(['New'])
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
    const classes = mountApp().findComponent(VBtn).classes()

    expect(classes).toContain('bg-primary')
    expect(classes).toContain('v-btn--variant-flat')
  })

  it('opens the entry dialog from the New action', async () => {
    const wrapper = mountApp()
    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(false)

    await wrapper.find('button').trigger('click')

    expect(wrapper.findComponent(NewEntryDialog).props('modelValue')).toBe(true)
  })

  it('saves the entry the dialog hands over', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NewEntryDialog).vm.$emit('save', newEntry)
    await nextTick()

    expect(saveEntry).toHaveBeenCalledWith(newEntry)
  })

  it('closes the dialog and confirms once the entry is stored', async () => {
    const wrapper = mountApp()
    await wrapper.find('button').trigger('click')

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
    await wrapper.find('button').trigger('click')
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

  it('keeps the dialog open and says nothing was saved when the save fails', async () => {
    saveEntry.mockResolvedValue(null)
    saveError.value = 'The entry could not be saved. Check your connection and try again.'
    const wrapper = mountApp()
    await wrapper.find('button').trigger('click')

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

    await wrapper.find('button').trigger('click')

    expect(saveError.value).toBeNull()
    expect(wrapper.findComponent(NewEntryDialog).props('error')).toBeNull()
  })

  it('fills the content area with the entry list', () => {
    const wrapper = mountApp()
    const list = wrapper.findComponent(EntryList)

    expect(list.exists()).toBe(true)
    expect(wrapper.find('.v-main').element.contains(list.element)).toBe(true)
  })

  it('loads the entries as soon as it is shown', () => {
    mountApp()

    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('hands the list what the composable knows', async () => {
    entries.value = [stored]
    loading.value = false
    loadError.value = null

    const list = mountApp().findComponent(EntryList)

    expect(list.props('entries')).toEqual([stored])
    expect(list.props('loading')).toBe(false)
    expect(list.props('error')).toBeNull()
  })

  it('reloads when the list asks to retry', async () => {
    const wrapper = mountApp()
    loadEntries.mockClear()

    wrapper.findComponent(EntryList).vm.$emit('retry')
    await nextTick()

    expect(loadEntries).toHaveBeenCalledTimes(1)
  })

  it('constrains the shell to its container rather than the viewport', () => {
    // A viewport-relative width would overflow the app region the Hub allocates.
    const viewportWidths = mountApp()
      .findAll('*')
      .filter((node) => /width:[^;]*\b\d+(vw|dvw)/.test(node.attributes('style') ?? ''))

    expect(viewportWidths).toHaveLength(0)
  })
})
