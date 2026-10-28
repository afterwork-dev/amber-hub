import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VSnackbar } from 'vuetify/components/VSnackbar'
import type { NetworthEntry } from '../../shared/types'
import ConfirmDialog from '../ConfirmDialog.vue'
import MonthDialog from '../MonthDialog.vue'
import NetworthApp from '../NetworthApp.vue'
import NetworthDashboard from '../NetworthDashboard.vue'
import { entryFactory } from './entryFactory'

vi.mock('vue-chartjs', async () => (await import('./chartStub')).chartModule)

const entries = ref<NetworthEntry[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const loadEntries = vi.fn()
const replaceMonth = vi.fn()
const removeMonth = vi.fn()

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveMonth = vi.fn()

const deleting = ref(false)
const deleteError = ref<string | null>(null)
const deleteMonth = vi.fn()

vi.mock('../useEntryList', () => ({
  useEntryList: () => ({
    entries,
    loading,
    error: loadError,
    loadEntries,
    replaceMonth,
    removeMonth,
  }),
}))

vi.mock('../useSaveMonth', () => ({
  useSaveMonth: () => ({ saving, error: saveError, saveMonth }),
}))

vi.mock('../useDeleteMonth', () => ({
  useDeleteMonth: () => ({ deleting, error: deleteError, deleteMonth }),
}))

const september = [
  entryFactory({ month: '2026-09', name: 'Main Account' }),
  entryFactory({ month: '2026-09', name: 'Mortgage', amountCents: -12900000 }),
]
const monthInput = [{ name: 'Main Account', category: 'cash', amountCents: 100, quantity: 1 }]

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
  entries.value = [...september]
  loading.value = false
  loadError.value = null
  loadEntries.mockReset()
  replaceMonth.mockReset()
  removeMonth.mockReset()
  saving.value = false
  saveError.value = null
  saveMonth.mockReset()
  saveMonth.mockResolvedValue(september)
  deleting.value = false
  deleteError.value = null
  deleteMonth.mockReset()
  deleteMonth.mockResolvedValue(true)
})

function mountApp() {
  const host = { getBoundingClientRect: () => ({ top: 200 }) } as unknown as Element
  return mount(NetworthApp, {
    props: { host },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function snackbarTexts(): string[] {
  return [...document.querySelectorAll('.v-snackbar__content')].map(
    (node) => node.textContent ?? '',
  )
}

function button(wrapper: ReturnType<typeof mountApp>, text: string) {
  const found = wrapper.findAllComponents(VBtn).find((btn) => btn.props('text') === text)
  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

describe('NetworthApp', () => {
  it('names the app and fills the height left below it', () => {
    const wrapper = mountApp()

    expect(wrapper.find('h1').text()).toBe('Net Worth')
    expect(wrapper.find('.networth-shell').attributes('style')).toContain('height: 800px')
  })

  it('loads the entries on mount and hands them to the dashboard', () => {
    const wrapper = mountApp()

    expect(loadEntries).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent(NetworthDashboard).props('entries')).toEqual(september)
  })

  it('retries a failed load', async () => {
    loadError.value = 'Your net worth could not be loaded.'
    const wrapper = mountApp()

    wrapper.findComponent(NetworthDashboard).vm.$emit('retry')

    expect(loadEntries).toHaveBeenCalledTimes(2)
  })

  it('opens a new month from “New”, clearing an old save error', async () => {
    saveError.value = 'old failure'
    const wrapper = mountApp()

    await button(wrapper, 'New').trigger('click')

    const dialog = wrapper.findComponent(MonthDialog)
    expect(dialog.props('modelValue')).toBe(true)
    expect(dialog.props('month')).toBeNull()
    expect(saveError.value).toBeNull()
  })

  it('opens a recorded month from the dashboard for editing', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(NetworthDashboard).vm.$emit('select', '2026-09')
    await flushPromises()

    expect(wrapper.findComponent(MonthDialog).props('month')).toBe('2026-09')
  })

  it('saves a month, updates the list, closes the dialog and confirms', async () => {
    const wrapper = mountApp()
    await button(wrapper, 'New').trigger('click')

    wrapper.findComponent(MonthDialog).vm.$emit('save', '2026-10', monthInput)
    await flushPromises()

    expect(saveMonth).toHaveBeenCalledWith('2026-10', monthInput)
    expect(replaceMonth).toHaveBeenCalledWith('2026-10', september)
    expect(wrapper.findComponent(MonthDialog).props('modelValue')).toBe(false)
    expect(wrapper.findComponent(VSnackbar).props('modelValue')).toBe(true)
    await flushPromises()
    expect(snackbarTexts().some((text) => text.includes('Month saved'))).toBe(true)
  })

  it('keeps the dialog open when the save fails', async () => {
    saveMonth.mockResolvedValue(null)
    const wrapper = mountApp()
    await button(wrapper, 'New').trigger('click')

    wrapper.findComponent(MonthDialog).vm.$emit('save', '2026-10', monthInput)
    await flushPromises()

    expect(replaceMonth).not.toHaveBeenCalled()
    expect(wrapper.findComponent(MonthDialog).props('modelValue')).toBe(true)
  })

  it('confirms before deleting a month, naming how many entries go', async () => {
    const wrapper = mountApp()

    wrapper.findComponent(MonthDialog).vm.$emit('delete', '2026-09')
    await flushPromises()

    const confirm = wrapper.findComponent(ConfirmDialog)
    expect(confirm.props('modelValue')).toBe(true)
    expect(confirm.props('title')).toBe('Delete September 2026?')
    expect(confirm.props('message')).toBe(
      'All 2 entries of this month will be deleted. This cannot be undone.',
    )
    expect(deleteMonth).not.toHaveBeenCalled()
  })

  it('deletes the month once confirmed', async () => {
    const wrapper = mountApp()
    wrapper.findComponent(MonthDialog).vm.$emit('delete', '2026-09')
    await flushPromises()

    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm')
    await flushPromises()

    expect(deleteMonth).toHaveBeenCalledWith('2026-09')
    expect(removeMonth).toHaveBeenCalledWith('2026-09')
    expect(wrapper.findComponent(ConfirmDialog).props('modelValue')).toBe(false)
    expect(wrapper.findComponent(MonthDialog).props('modelValue')).toBe(false)
    await flushPromises()
    expect(snackbarTexts().some((text) => text.includes('Month deleted'))).toBe(true)
  })

  it('keeps the confirmation open when the delete fails', async () => {
    deleteMonth.mockResolvedValue(false)
    const wrapper = mountApp()
    wrapper.findComponent(MonthDialog).vm.$emit('delete', '2026-09')
    await flushPromises()

    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm')
    await flushPromises()

    expect(removeMonth).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ConfirmDialog).props('modelValue')).toBe(true)
  })

  it('cancels a pending delete', async () => {
    const wrapper = mountApp()
    wrapper.findComponent(MonthDialog).vm.$emit('delete', '2026-09')
    await flushPromises()

    wrapper.findComponent(ConfirmDialog).vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.findComponent(ConfirmDialog).props('modelValue')).toBe(false)
  })

  it('names a single entry in the singular', async () => {
    entries.value = [september[0]!]
    const wrapper = mountApp()

    wrapper.findComponent(MonthDialog).vm.$emit('delete', '2026-09')
    await flushPromises()

    expect(wrapper.findComponent(ConfirmDialog).props('message')).toContain('All 1 entry')
  })
})
