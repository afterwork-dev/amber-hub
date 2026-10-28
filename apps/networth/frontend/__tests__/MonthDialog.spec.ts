import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VAlert } from 'vuetify/components/VAlert'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard } from 'vuetify/components/VCard'
import { VDialog } from 'vuetify/components/VDialog'
import { VDivider } from 'vuetify/components/VDivider'
import { VSelect } from 'vuetify/components/VSelect'
import { VTextField } from 'vuetify/components/VTextField'
import type { NetworthEntry } from '../../shared/types'
import MonthDialog from '../MonthDialog.vue'
import MonthEntryRow from '../MonthEntryRow.vue'
import { entryFactory } from './entryFactory'

const september = [
  entryFactory({
    id: 'gold',
    month: '2026-09',
    position: 0,
    name: 'Gold 5g',
    category: 'commodities',
    amountCents: 50000,
    quantity: 3,
  }),
  entryFactory({
    id: 'card',
    month: '2026-09',
    position: 1,
    name: 'Luxury Card',
    category: 'cash',
    amountCents: -120000,
  }),
]
const august = [entryFactory({ id: 'old', month: '2026-08', name: 'Savings', amountCents: 900000 })]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 18))
})

afterEach(() => {
  vi.useRealTimers()
})

function mountDialog(
  props: { month?: string | null; entries?: NetworthEntry[]; [key: string]: unknown } = {},
) {
  return mount(MonthDialog, {
    props: { modelValue: true, month: null, entries: [], ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function fields(wrapper: VueWrapper, label: string) {
  return wrapper.findAllComponents(VTextField).filter((field) => field.props('label') === label)
}

function select(wrapper: VueWrapper, label: string) {
  const found = wrapper.findAllComponents(VSelect).find((field) => field.props('label') === label)
  if (!found) throw new Error(`no select labelled "${label}"`)
  return found
}

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper.findAllComponents(VBtn).find((btn) => btn.props('text') === text)
  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

function labelled(wrapper: VueWrapper, label: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((btn) => btn.attributes('aria-label') === label)
  if (!found) throw new Error(`no button labelled "${label}"`)
  return found
}

// The dialog teleports its content out of the wrapper's DOM, so text is read from the component tree.
function dialogText(wrapper: VueWrapper): string {
  return wrapper.findComponent(VCard).text()
}

function hasButton(wrapper: VueWrapper, text: string): boolean {
  return wrapper.findAllComponents(VBtn).some((btn) => btn.props('text') === text)
}

function values(wrapper: VueWrapper, label: string): unknown[] {
  return fields(wrapper, label).map((field) => field.props('modelValue'))
}

async function save(wrapper: VueWrapper) {
  await button(wrapper, 'Save').trigger('click')
  await flushPromises()
}

describe('MonthDialog — the first month', () => {
  it('starts on the current month with one empty entry', () => {
    const wrapper = mountDialog()

    expect(dialogText(wrapper)).toContain('New month')
    expect(select(wrapper, 'Month').props('modelValue')).toBe(10)
    expect(select(wrapper, 'Year').props('modelValue')).toBe(2026)
    expect(wrapper.findAllComponents(MonthEntryRow)).toHaveLength(1)
    expect(values(wrapper, 'Quantity')).toEqual(['1'])
  })

  it('saves the entries for the chosen month', async () => {
    const wrapper = mountDialog()
    await fields(wrapper, 'Name')[0]?.setValue('Gold 5g')
    await wrapper.findAllComponents(VSelect).at(-1)?.setValue('commodities')
    await fields(wrapper, 'Amount')[0]?.setValue('500')
    await fields(wrapper, 'Quantity')[0]?.setValue('3')
    await select(wrapper, 'Month').setValue(9)

    await save(wrapper)

    expect(wrapper.emitted('save')).toEqual([
      ['2026-09', [{ name: 'Gold 5g', category: 'commodities', amountCents: 50000, quantity: 3 }]],
    ])
  })

  it('saves nothing while an entry is incomplete', async () => {
    const wrapper = mountDialog()

    await save(wrapper)

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(dialogText(wrapper)).toContain('A name is required.')
    expect(dialogText(wrapper)).toContain('A category is required.')
    expect(dialogText(wrapper)).toContain('An amount is required.')
  })

  it('refuses a future month', async () => {
    const wrapper = mountDialog()
    await select(wrapper, 'Month').setValue(11)

    await save(wrapper)

    expect(dialogText(wrapper)).toContain('Pick a month that is not in the future.')
  })

  it('offers the last ten years', () => {
    expect(select(mountDialog(), 'Year').props('items')).toHaveLength(11)
  })
})

describe('MonthDialog — a following month', () => {
  const entries = [...september, ...august]

  it('picks the month after the latest one recorded', () => {
    const wrapper = mountDialog({ entries })

    expect(select(wrapper, 'Month').props('modelValue')).toBe(10)
  })

  it('prefills the latest month’s entries without their amounts', () => {
    const wrapper = mountDialog({ entries })

    expect(values(wrapper, 'Name')).toEqual(['Gold 5g', 'Luxury Card'])
    expect(values(wrapper, 'Quantity')).toEqual(['3', '1'])
    expect(values(wrapper, 'Amount')).toEqual(['', ''])
  })

  it('stores prefilled entries as new ones', async () => {
    const wrapper = mountDialog({ entries })
    await fields(wrapper, 'Amount')[0]?.setValue('510')
    await fields(wrapper, 'Amount')[1]?.setValue('-1.000')

    await save(wrapper)

    const [, saved] = wrapper.emitted('save')?.[0] as [string, { id?: string }[]]
    expect(saved.map((entry) => entry.id)).toEqual([undefined, undefined])
  })

  it('refuses a month that is already recorded', async () => {
    const wrapper = mountDialog({ entries })
    await select(wrapper, 'Month').setValue(9)

    await save(wrapper)

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(dialogText(wrapper)).toContain(
      'September 2026 is already recorded. Open it from the table to edit it.',
    )
  })

  it('adds and removes entries, always keeping one', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Add entry').trigger('click')
    expect(wrapper.findAllComponents(MonthEntryRow)).toHaveLength(2)

    await labelled(wrapper, 'Remove entry 2').trigger('click')
    expect(wrapper.findAllComponents(MonthEntryRow)).toHaveLength(1)
    expect(labelled(wrapper, 'Remove entry 1').props('disabled')).toBe(true)
  })

  it('totals the entries as they are typed', async () => {
    const wrapper = mountDialog({ entries })
    await fields(wrapper, 'Amount')[0]?.setValue('500')
    await fields(wrapper, 'Amount')[1]?.setValue('-200')

    const text = dialogText(wrapper)
    expect(text).toContain('Assets1.500,00 €')
    expect(text).toContain('Liabilities-200,00 €')
    expect(text).toContain('Net worth1.300,00 €')
  })
})

describe('MonthDialog — editing a month', () => {
  const entries = [...september, ...august]

  it('shows the month’s entries with their amounts and keeps the month fixed', () => {
    const wrapper = mountDialog({ month: '2026-09', entries })

    expect(dialogText(wrapper)).toContain('September 2026')
    expect(select(wrapper, 'Month').props('disabled')).toBe(true)
    expect(select(wrapper, 'Year').props('disabled')).toBe(true)
    expect(values(wrapper, 'Amount')).toEqual(['500,00', '-1.200,00'])
  })

  it('saves edits against the existing entries', async () => {
    const wrapper = mountDialog({ month: '2026-09', entries })
    await fields(wrapper, 'Amount')[0]?.setValue('520')

    await save(wrapper)

    expect(wrapper.emitted('save')).toEqual([
      [
        '2026-09',
        [
          { id: 'gold', name: 'Gold 5g', category: 'commodities', amountCents: 52000, quantity: 3 },
          { id: 'card', name: 'Luxury Card', category: 'cash', amountCents: -120000, quantity: 1 },
        ],
      ],
    ])
  })

  it('asks to delete the month', async () => {
    const wrapper = mountDialog({ month: '2026-09', entries })

    await button(wrapper, 'Delete month').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([['2026-09']])
  })

  it('offers no delete for a new month', () => {
    expect(hasButton(mountDialog({ entries }), 'Delete month')).toBe(false)
  })
})

describe('MonthDialog — dialog behaviour', () => {
  it('shows a save failure and keeps the dialog open', () => {
    const wrapper = mountDialog({ error: 'The month could not be saved.' })

    expect(wrapper.findComponent(VAlert).text()).toContain('The month could not be saved.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('blocks a second save while one is in flight', () => {
    const wrapper = mountDialog({ saving: true })

    expect(button(wrapper, 'Save').props('loading')).toBe(true)
    expect(button(wrapper, 'Save').props('disabled')).toBe(true)
  })

  it('asks to close on Cancel', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('starts over when reopened', async () => {
    const wrapper = mountDialog()
    await fields(wrapper, 'Name')[0]?.setValue('Typed but never saved')
    await button(wrapper, 'Add entry').trigger('click')

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(values(wrapper, 'Name')).toEqual([''])
  })

  it('separates stacked entries on phone widths only', () => {
    const entries = [...september, ...august]

    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    expect(mountDialog({ entries }).findAllComponents(VDivider)).toHaveLength(1)

    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    expect(mountDialog({ entries }).findAllComponents(VDivider)).toHaveLength(0)
  })

  it('goes fullscreen on phone widths only', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
    expect(mountDialog().findComponent(VDialog).props('fullscreen')).toBe(true)

    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    expect(mountDialog().findComponent(VDialog).props('fullscreen')).toBe(false)
  })
})
