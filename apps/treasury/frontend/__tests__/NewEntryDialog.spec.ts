import { describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VTextField } from 'vuetify/components/VTextField'
import { VSelect } from 'vuetify/components/VSelect'
import { VBtn } from 'vuetify/components/VBtn'
import { VAlert } from 'vuetify/components/VAlert'
import { VDialog } from 'vuetify/components/VDialog'
import NewEntryDialog from '../NewEntryDialog.vue'

// The dialog teleports its content out of the wrapper's DOM, so everything below queries the
// component tree rather than rendered HTML.
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(NewEntryDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function mountAtWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  return mount(NewEntryDialog, {
    props: { modelValue: true },
    global: { plugins: [createVuetify({ theme: false })] },
  })
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

describe('NewEntryDialog', () => {
  it('offers the six fields the entry is made of', () => {
    const wrapper = mountDialog()

    for (const label of ['Name', 'Serial No', 'Purchase date', 'Purchase value']) {
      expect(field(wrapper, label).exists()).toBe(true)
    }
    for (const label of ['Location', 'Category']) {
      expect(select(wrapper, label).exists()).toBe(true)
    }
  })

  it('opens with every field empty', () => {
    const wrapper = mountDialog()

    for (const label of ['Name', 'Serial No', 'Purchase date', 'Purchase value']) {
      expect(field(wrapper, label).props('modelValue')).toBeFalsy()
    }
    for (const label of ['Location', 'Category']) {
      expect(select(wrapper, label).props('modelValue')).toBeFalsy()
    }
  })

  it('offers the catalog locations by display name, with none pre-selected', () => {
    const locations = select(mountDialog(), 'Location')

    expect(locations.props('items')).toEqual([
      { id: 'location-1', name: 'Location 1' },
      { id: 'location-2', name: 'Location 2' },
    ])
    expect(locations.props('itemTitle')).toBe('name')
    expect(locations.props('itemValue')).toBe('id')
    expect(locations.props('modelValue')).toBeFalsy()
  })

  it('offers the catalog categories by display name, with none pre-selected', () => {
    const categories = select(mountDialog(), 'Category')

    const names = (categories.props('items') as { name: string }[]).map((category) => category.name)

    expect(names).toEqual(['Gold', 'Collectible', 'Inheritance'])
    expect(categories.props('itemTitle')).toBe('name')
    expect(categories.props('itemValue')).toBe('id')
    expect(categories.props('modelValue')).toBeFalsy()
  })

  it('offers no way to type a category of the user’s own', () => {
    const categories = select(mountDialog(), 'Category')

    expect(categories.props('items')).toHaveLength(3)
    expect(categories.find('input').attributes('inputmode')).toBe('none')
  })

  it('emits the chosen category as its stable id, not its display name', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Gift coin')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-inheritance')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ categoryId: 'category-inheritance' })
  })

  it('asks for the purchase date in European day-month-year order', () => {
    const date = field(mountDialog(), 'Purchase date')

    expect(date.find('input').attributes('type')).toBe('text')
    expect(date.props('placeholder')).toBe('DD-MM-YYYY')
  })

  it('marks the purchase value as euros', () => {
    expect(field(mountDialog(), 'Purchase value').props('suffix')).toBe('€')
  })

  it('presents Save as a filled primary action, and Cancel as a plain one', () => {
    const wrapper = mountDialog()

    expect(button(wrapper, 'Save').classes()).toContain('bg-primary')
    expect(button(wrapper, 'Save').classes()).toContain('v-btn--variant-flat')
    expect(button(wrapper, 'Cancel').classes()).not.toContain('bg-primary')
  })

  it('emits the mandatory fields on save', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { name: 'Krugerrand', categoryId: 'category-gold', locationId: 'location-1' },
    ])
  })

  it('emits every filled field, with the amount converted to cents', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand 1 oz')
    await field(wrapper, 'Serial No').setValue('K-2020-0042')
    await field(wrapper, 'Purchase date').setValue('03-11-2024')
    await field(wrapper, 'Purchase value').setValue('2.450,50')
    await select(wrapper, 'Location').setValue('location-2')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        name: 'Krugerrand 1 oz',
        categoryId: 'category-gold',
        serialNo: 'K-2020-0042',
        purchaseDate: '2024-11-03',
        purchaseValueCents: 245050,
        locationId: 'location-2',
      },
    ])
  })

  it('omits optional fields left empty rather than sending blanks', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('  Maple Leaf  ')
    await field(wrapper, 'Serial No').setValue('   ')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { name: 'Maple Leaf', categoryId: 'category-gold', locationId: 'location-1' },
    ])
  })

  it('starts blank again after being cancelled with data in it', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand')
    await field(wrapper, 'Serial No').setValue('K-1')
    await field(wrapper, 'Purchase date').setValue('03-11-2024')
    await field(wrapper, 'Purchase value').setValue('12,50')
    await select(wrapper, 'Location').setValue('location-2')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Cancel').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    for (const label of ['Name', 'Serial No', 'Purchase date', 'Purchase value']) {
      expect(field(wrapper, label).props('modelValue')).toBeFalsy()
    }
    expect(select(wrapper, 'Location').props('modelValue')).toBeFalsy()
  })

  it('starts blank again after a save', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Name').props('modelValue')).toBeFalsy()
    expect(select(wrapper, 'Location').props('modelValue')).toBeFalsy()
  })

  it('keeps a zero purchase value, which is not the same as leaving it empty', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Gift coin')
    await field(wrapper, 'Purchase value').setValue('0')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ purchaseValueCents: 0 })
  })

  it('shows a save failure without discarding what was typed', async () => {
    const wrapper = mountDialog({ error: 'The entry could not be saved.' })
    await field(wrapper, 'Name').setValue('Krugerrand')

    expect(wrapper.findComponent(VAlert).text()).toContain('could not be saved')
    expect(field(wrapper, 'Name').props('modelValue')).toBe('Krugerrand')
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

    expect(labelId).toBe('treasury-new-entry-title')
    expect(document.getElementById(labelId as string)?.textContent?.trim()).toBe('New entry')
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

  it('titles the dialog with a heading below the app’s own', () => {
    mountDialog()

    expect(document.getElementById('treasury-new-entry-title')?.tagName).toBe('H2')
  })

  // autofocus lands on the field before the dialog's focus trap runs, which then takes focus
  // back — visible as a flash on the first field.
  it('leaves the opening focus to the dialog rather than grabbing it', () => {
    expect(field(mountDialog(), 'Name').find('input').attributes('autofocus')).toBeUndefined()
  })

  it('blocks Save while a save is already in flight', async () => {
    const wrapper = mountDialog({ saving: true })
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(button(wrapper, 'Save').props('disabled')).toBe(true)
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('shows the in-flight save on the Save control', () => {
    expect(button(mountDialog({ saving: true }), 'Save').props('loading')).toBe(true)
    expect(button(mountDialog(), 'Save').props('loading')).toBe(false)
  })

  it('lets Save through once no save is in flight', async () => {
    const wrapper = mountDialog({ saving: false })
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(button(wrapper, 'Save').props('disabled')).toBe(false)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})

describe('NewEntryDialog — validation', () => {
  async function saveWith(wrapper: VueWrapper, values: Record<string, string>) {
    for (const [label, value] of Object.entries(values)) await field(wrapper, label).setValue(value)
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()
  }

  function messagesOf(wrapper: VueWrapper, label: string): string[] {
    return field(wrapper, label)
      .findAll('.v-messages__message')
      .map((node) => node.text())
  }

  it('says nothing is wrong until the user tries to save', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    for (const label of ['Name', 'Serial No', 'Purchase date', 'Purchase value']) {
      expect(messagesOf(wrapper, label)).toHaveLength(0)
    }
    expect(select(wrapper, 'Location').text()).not.toMatch(/required/i)
  })

  it('stays quiet while the user is still typing', async () => {
    const wrapper = mountDialog()

    await field(wrapper, 'Name').setValue('K')
    await field(wrapper, 'Name').setValue('')
    await field(wrapper, 'Purchase value').setValue('abc')
    await flushPromises()

    expect(messagesOf(wrapper, 'Name')).toHaveLength(0)
    expect(messagesOf(wrapper, 'Purchase value')).toHaveLength(0)
  })

  it('saves nothing and marks every mandatory field when the form is empty', async () => {
    const wrapper = mountDialog()

    await saveWith(wrapper, {})

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(true)
    expect(messagesOf(wrapper, 'Name').join()).toMatch(/required/i)
    expect(select(wrapper, 'Location').text()).toMatch(/required/i)
    expect(select(wrapper, 'Category').text()).toMatch(/required/i)
  })

  it('saves nothing when only the category is missing', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(true)
    expect(select(wrapper, 'Category').text()).toMatch(/category is required/i)
  })

  it('lets the entry through once the missing category is chosen', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Krugerrand')
    await select(wrapper, 'Location').setValue('location-1')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('save')).toBeUndefined()

    await select(wrapper, 'Category').setValue('category-gold')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(select(wrapper, 'Category').text()).not.toMatch(/required/i)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('treats a whitespace-only name as missing', async () => {
    const wrapper = mountDialog()

    await saveWith(wrapper, { Name: '   ' })

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(messagesOf(wrapper, 'Name').join()).toMatch(/required/i)
  })

  it('rejects a name or serial number beyond the length bound', async () => {
    const wrapper = mountDialog()

    await saveWith(wrapper, { Name: 'x'.repeat(201), 'Serial No': 'y'.repeat(201) })

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(messagesOf(wrapper, 'Name').join()).toMatch(/200/)
    expect(messagesOf(wrapper, 'Serial No').join()).toMatch(/200/)
  })

  it('rejects a purchase value that is not an amount', async () => {
    const wrapper = mountDialog()

    await saveWith(wrapper, { Name: 'Coin', 'Purchase value': 'abc' })

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(messagesOf(wrapper, 'Purchase value')).not.toHaveLength(0)
  })

  it('rejects a negative purchase value but accepts zero', async () => {
    const negative = mountDialog()
    await saveWith(negative, { Name: 'Coin', 'Purchase value': '-5' })
    expect(negative.emitted('save')).toBeUndefined()

    const zero = mountDialog()
    await field(zero, 'Purchase value').setValue('0')
    await saveWith(zero, { Name: 'Coin' })
    await select(zero, 'Location').setValue('location-1')
    await select(zero, 'Category').setValue('category-gold')
    await button(zero, 'Save').trigger('click')
    await flushPromises()

    expect(zero.emitted('save')?.at(-1)?.[0]).toMatchObject({ purchaseValueCents: 0 })
  })

  it('rejects a purchase date in the future, off the calendar, or not day-month-year', async () => {
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const [year, month, day] = tomorrow.toISOString().slice(0, 10).split('-')
    const wrapper = mountDialog()

    await saveWith(wrapper, { Name: 'Coin', 'Purchase date': `${day}-${month}-${year}` })
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(messagesOf(wrapper, 'Purchase date').join()).toMatch(/DD-MM-YYYY/)

    for (const typed of ['30-02-2024', '2024-11-03']) {
      await saveWith(wrapper, { 'Purchase date': typed })
      expect(wrapper.emitted('save')).toBeUndefined()
    }
  })

  it('lets the entry through once the offending field is corrected', async () => {
    const wrapper = mountDialog()
    await saveWith(wrapper, { Name: 'Coin', 'Purchase value': 'abc' })
    expect(wrapper.emitted('save')).toBeUndefined()

    await field(wrapper, 'Purchase value').setValue('12,50')
    await select(wrapper, 'Location').setValue('location-1')
    await select(wrapper, 'Category').setValue('category-gold')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(messagesOf(wrapper, 'Purchase value')).toHaveLength(0)
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({ purchaseValueCents: 1250 })
  })
})
