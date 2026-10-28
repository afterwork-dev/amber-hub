import { describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VTextField } from 'vuetify/components/VTextField'
import { VSelect } from 'vuetify/components/VSelect'
import { VBtn } from 'vuetify/components/VBtn'
import { VAlert } from 'vuetify/components/VAlert'
import { VDialog } from 'vuetify/components/VDialog'
import type { InvestmentIncomeAsset } from '../../shared/types'
import NewEntryDialog from '../NewEntryDialog.vue'

const vanguard: InvestmentIncomeAsset = {
  id: 'asset-1',
  userId: 'user-1',
  name: 'Vanguard FTSE All-World',
  bookingName: 'VANG FTSE AW DIST',
  createdAt: '2026-09-12T10:14:05.213Z',
}

const flat: InvestmentIncomeAsset = {
  id: 'asset-2',
  userId: 'user-1',
  name: 'Flat, Main Street 4',
  createdAt: '2026-09-11T08:02:44.900Z',
}

const ASSETS = [vanguard, flat]

function typedDaysFromToday(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  const [year, month, day] = date.toISOString().slice(0, 10).split('-')
  return `${day}-${month}-${year}`
}

// The dialog teleports its content out of the wrapper's DOM, so everything below queries the
// component tree rather than rendered HTML.
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(NewEntryDialog, {
    props: { modelValue: true, assets: ASSETS, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function mountAtWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  return mountDialog()
}

function field(wrapper: VueWrapper, label: string) {
  const found = wrapper
    .findAllComponents(VTextField)
    .find((candidate) => candidate.props('label') === label)

  if (!found) throw new Error(`no field labelled "${label}"`)
  return found
}

function select(wrapper: VueWrapper, label: string) {
  const found = wrapper
    .findAllComponents(VSelect)
    .find((candidate) => candidate.props('label') === label)

  if (!found) throw new Error(`no select labelled "${label}"`)
  return found
}

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === text)

  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

async function fillValid(wrapper: VueWrapper, amount = '12,50') {
  await field(wrapper, 'Payout date').setValue('10-09-2026')
  await field(wrapper, 'Amount').setValue(amount)
  await select(wrapper, 'Asset').setValue('asset-1')
}

async function save(wrapper: VueWrapper) {
  await button(wrapper, 'Save').trigger('click')
  await flushPromises()
}

describe('NewEntryDialog', () => {
  it('offers the three fields a payout is made of', () => {
    const wrapper = mountDialog()

    expect(field(wrapper, 'Payout date').exists()).toBe(true)
    expect(field(wrapper, 'Amount').exists()).toBe(true)
    expect(select(wrapper, 'Asset').exists()).toBe(true)
  })

  it('offers nothing left over from the holdings the app used to record', () => {
    const wrapper = mountDialog()
    // A VSelect renders its own VTextField, so the same label shows up twice.
    const labels = new Set([
      ...wrapper.findAllComponents(VTextField).map((input) => input.props('label')),
      ...wrapper.findAllComponents(VSelect).map((input) => input.props('label')),
    ])

    expect([...labels]).toEqual(['Payout date', 'Amount', 'Asset'])
  })

  it('opens with every field empty', () => {
    const wrapper = mountDialog()

    expect(field(wrapper, 'Payout date').props('modelValue')).toBeFalsy()
    expect(field(wrapper, 'Amount').props('modelValue')).toBeFalsy()
    expect(select(wrapper, 'Asset').props('modelValue')).toBeFalsy()
  })

  it('asks for the payout date in European day-month-year order', () => {
    const date = field(mountDialog(), 'Payout date')

    expect(date.find('input').attributes('type')).toBe('text')
    expect(date.props('placeholder')).toBe('DD-MM-YYYY')
  })

  it('marks the amount as euros and invites a decimal keypad', () => {
    const amount = field(mountDialog(), 'Amount')

    expect(amount.props('suffix')).toBe('€')
    expect(amount.find('input').attributes('inputmode')).toBe('decimal')
  })

  it('offers the user’s own assets by name, with none pre-selected', () => {
    const assets = select(mountDialog(), 'Asset')

    expect(assets.props('items')).toEqual(ASSETS)
    expect(assets.props('itemTitle')).toBe('name')
    expect(assets.props('itemValue')).toBe('id')
    expect(assets.props('modelValue')).toBeFalsy()
  })

  it('offers no way to type an asset of the user’s own', () => {
    expect(select(mountDialog(), 'Asset').find('input').attributes('inputmode')).toBe('none')
  })

  it('presents Save as a filled primary action, and Cancel as a plain one', () => {
    const wrapper = mountDialog()

    expect(button(wrapper, 'Save').classes()).toContain('bg-primary')
    expect(button(wrapper, 'Save').classes()).toContain('v-btn--variant-flat')
    expect(button(wrapper, 'Cancel').classes()).not.toContain('bg-primary')
  })

  it('emits the payout with the amount converted to cents', async () => {
    const wrapper = mountDialog()
    await fillValid(wrapper)

    await save(wrapper)

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { payoutDate: '2026-09-10', amountCents: 1250, assetId: 'asset-1' },
    ])
  })

  it('emits the chosen asset as its stable id, not its display name', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Payout date').setValue('10-09-2026')
    await field(wrapper, 'Amount').setValue('400')
    await select(wrapper, 'Asset').setValue('asset-2')

    await save(wrapper)

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ assetId: 'asset-2' })
  })

  it('reads every euro notation the app accepts', async () => {
    const cases: [string, number][] = [
      ['1.234,56', 123456],
      ['1234.56', 123456],
      ['1234', 123400],
      ['0,01', 1],
      // A lone separator before exactly three digits groups thousands, as everywhere else in
      // the app: 1,234 is one thousand euros, not one euro twenty-three.
      ['1,234', 123400],
    ]

    for (const [typed, cents] of cases) {
      const wrapper = mountDialog()
      await fillValid(wrapper, typed)
      await save(wrapper)

      expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ amountCents: cents })
    }
  })

  it('starts blank again after being cancelled with data in it', async () => {
    const wrapper = mountDialog()
    await fillValid(wrapper)

    await button(wrapper, 'Cancel').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Payout date').props('modelValue')).toBeFalsy()
    expect(field(wrapper, 'Amount').props('modelValue')).toBeFalsy()
    expect(select(wrapper, 'Asset').props('modelValue')).toBeFalsy()
  })

  it('starts blank again after a save', async () => {
    const wrapper = mountDialog()
    await fillValid(wrapper)
    await save(wrapper)

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Amount').props('modelValue')).toBeFalsy()
    expect(select(wrapper, 'Asset').props('modelValue')).toBeFalsy()
  })

  it('shows a save failure without discarding what was typed', async () => {
    const wrapper = mountDialog({ error: 'The entry could not be saved.' })
    await field(wrapper, 'Amount').setValue('12,50')

    expect(wrapper.findComponent(VAlert).text()).toContain('could not be saved')
    expect(field(wrapper, 'Amount').props('modelValue')).toBe('12,50')
  })

  it('says nothing when there is no failure', () => {
    expect(mountDialog().findComponent(VAlert).exists()).toBe(false)
  })

  it('announces a save failure rather than only showing it', () => {
    const alert = mountDialog({ error: 'The entry could not be saved.' }).findComponent(VAlert)

    expect(alert.attributes('role')).toBe('alert')
  })

  it('names itself for assistive technology', () => {
    mountDialog()

    const dialog = document.querySelector('[role="dialog"]')
    const labelId = dialog?.getAttribute('aria-labelledby')

    expect(labelId).toBe('investment-income-new-entry-title')
    expect(document.getElementById(labelId as string)?.textContent?.trim()).toBe('New entry')
  })

  it('titles the dialog with a heading below the app’s own', () => {
    mountDialog()

    expect(document.getElementById('investment-income-new-entry-title')?.tagName).toBe('H2')
  })

  it('gives every field a label', () => {
    const wrapper = mountDialog()

    for (const input of wrapper.findAll('input')) {
      const id = input.attributes('id')
      expect(document.querySelector(`label[for="${id}"]`)?.textContent?.trim()).toBeTruthy()
    }
  })

  it('takes the whole screen on a phone, and a panel on a desktop', () => {
    expect(mountAtWidth(320).findComponent(VDialog).props('fullscreen')).toBe(true)
    expect(mountAtWidth(1280).findComponent(VDialog).props('fullscreen')).toBe(false)
  })

  it('leaves the opening focus to the dialog rather than grabbing it', () => {
    expect(field(mountDialog(), 'Payout date').find('input').attributes('autofocus')).toBeUndefined()
  })

  it('blocks Save while a save is already in flight', async () => {
    const wrapper = mountDialog({ saving: true })
    await fillValid(wrapper)

    await save(wrapper)
    await save(wrapper)

    expect(button(wrapper, 'Save').props('disabled')).toBe(true)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('shows the in-flight save on the Save control', () => {
    expect(button(mountDialog({ saving: true }), 'Save').props('loading')).toBe(true)
    expect(button(mountDialog(), 'Save').props('loading')).toBe(false)
  })

  it('lets Save through once no save is in flight', async () => {
    const wrapper = mountDialog({ saving: false })
    await fillValid(wrapper)

    await save(wrapper)

    expect(button(wrapper, 'Save').props('disabled')).toBe(false)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})

describe('NewEntryDialog — assets', () => {
  it('tells a user with no assets to add one first', () => {
    const wrapper = mountDialog({ assets: [] })
    const assets = select(wrapper, 'Asset')

    expect(assets.props('items')).toEqual([])
    expect(assets.text()).toMatch(/New Asset/)
    expect(assets.props('noDataText')).toMatch(/New Asset/)
  })

  it('drops the hint once the user has an asset', () => {
    expect(select(mountDialog(), 'Asset').text()).not.toMatch(/New Asset/)
  })

  it('saves nothing when the user has no asset to choose', async () => {
    const wrapper = mountDialog({ assets: [] })
    await field(wrapper, 'Payout date').setValue('10-09-2026')
    await field(wrapper, 'Amount').setValue('12,50')

    await save(wrapper)

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(select(wrapper, 'Asset').text()).toMatch(/required/i)
  })

  it('reports a failed asset load and offers a retry', async () => {
    const wrapper = mountDialog({
      assets: [],
      assetsError: 'The assets could not be loaded. Check your connection and try again.',
    })

    const alert = wrapper
      .findAllComponents(VAlert)
      .find((candidate) => candidate.text().includes('could not be loaded'))

    expect(alert?.attributes('role')).toBe('alert')

    await button(wrapper, 'Retry').trigger('click')

    expect(wrapper.emitted('retry-assets')).toHaveLength(1)
  })

  it('offers no retry while the assets are fine', () => {
    const wrapper = mountDialog()

    expect(
      wrapper.findAllComponents(VBtn).some((candidate) => candidate.props('text') === 'Retry'),
    ).toBe(false)
  })
})

describe('NewEntryDialog — validation', () => {
  function messagesOf(wrapper: VueWrapper, label: string): string[] {
    return field(wrapper, label)
      .findAll('.v-messages__message')
      .map((node) => node.text())
  }

  it('says nothing is wrong until the user tries to save', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(messagesOf(wrapper, 'Payout date')).toHaveLength(0)
    expect(messagesOf(wrapper, 'Amount')).toHaveLength(0)
    expect(select(wrapper, 'Asset').text()).not.toMatch(/required/i)
  })

  it('stays quiet while the user is still typing', async () => {
    const wrapper = mountDialog()

    await field(wrapper, 'Amount').setValue('abc')
    await field(wrapper, 'Payout date').setValue('')
    await flushPromises()

    expect(messagesOf(wrapper, 'Amount')).toHaveLength(0)
    expect(messagesOf(wrapper, 'Payout date')).toHaveLength(0)
  })

  it('saves nothing and marks all three fields when the form is empty', async () => {
    const wrapper = mountDialog()

    await save(wrapper)

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(true)
    expect(messagesOf(wrapper, 'Payout date').join()).toMatch(/payout date is required/i)
    expect(messagesOf(wrapper, 'Amount').join()).toMatch(/amount is required/i)
    expect(select(wrapper, 'Asset').text()).toMatch(/asset is required/i)
  })

  it('refuses an amount that is not a euro amount', async () => {
    for (const typed of ['abc', '1.234,567', '12,5,0', '-5']) {
      const wrapper = mountDialog()
      await fillValid(wrapper, typed)
      await save(wrapper)

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(messagesOf(wrapper, 'Amount').join()).toMatch(/1\.234,56/)
    }
  })

  it('refuses a payout of nothing', async () => {
    for (const typed of ['0', '0,00']) {
      const wrapper = mountDialog()
      await fillValid(wrapper, typed)
      await save(wrapper)

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(messagesOf(wrapper, 'Amount').join()).toMatch(/greater than zero/i)
    }
  })

  it('refuses a payout date that is not a real past date', async () => {
    for (const typed of [typedDaysFromToday(1), '30-02-2024', '2026-09-10', 'yesterday']) {
      const wrapper = mountDialog()
      await field(wrapper, 'Payout date').setValue(typed)
      await field(wrapper, 'Amount').setValue('12,50')
      await select(wrapper, 'Asset').setValue('asset-1')
      await save(wrapper)

      expect(wrapper.emitted('save')).toBeUndefined()
      expect(messagesOf(wrapper, 'Payout date').join()).toMatch(/not in the future/i)
    }
  })

  it('accepts a payout dated today', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Payout date').setValue(typedDaysFromToday(0))
    await field(wrapper, 'Amount').setValue('12,50')
    await select(wrapper, 'Asset').setValue('asset-1')

    await save(wrapper)

    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('lets the payout through once the missing asset is chosen', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Payout date').setValue('10-09-2026')
    await field(wrapper, 'Amount').setValue('12,50')
    await save(wrapper)
    expect(wrapper.emitted('save')).toBeUndefined()

    await select(wrapper, 'Asset').setValue('asset-1')
    await save(wrapper)

    expect(select(wrapper, 'Asset').text()).not.toMatch(/required/i)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
