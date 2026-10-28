import { describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VTextField } from 'vuetify/components/VTextField'
import { VBtn } from 'vuetify/components/VBtn'
import { VAlert } from 'vuetify/components/VAlert'
import { VDialog } from 'vuetify/components/VDialog'
import NewAssetDialog from '../NewAssetDialog.vue'

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(NewAssetDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function mountAtWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  return mount(NewAssetDialog, {
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

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === text)

  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

function messagesOf(wrapper: VueWrapper, label: string): string[] {
  return field(wrapper, label)
    .findAll('.v-messages__message')
    .map((node) => node.text())
}

describe('NewAssetDialog', () => {
  it('offers a Name field and an optional Booking name field', () => {
    const wrapper = mountDialog()

    expect(field(wrapper, 'Name').exists()).toBe(true)
    expect(field(wrapper, 'Booking name').exists()).toBe(true)
  })

  it('opens with both fields empty', () => {
    const wrapper = mountDialog()

    expect(field(wrapper, 'Name').props('modelValue')).toBeFalsy()
    expect(field(wrapper, 'Booking name').props('modelValue')).toBeFalsy()
  })

  it('emits the trimmed name on save', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('  Vanguard FTSE All-World  ')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([{ name: 'Vanguard FTSE All-World' }])
  })

  it('emits the trimmed booking name when one is given', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Vanguard')
    await field(wrapper, 'Booking name').setValue('  VANG FTSE AW  ')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([
      { name: 'Vanguard', bookingName: 'VANG FTSE AW' },
    ])
  })

  it('omits a blank or whitespace-only booking name rather than sending it', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Vanguard')
    await field(wrapper, 'Booking name').setValue('   ')

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')?.[0]).toEqual([{ name: 'Vanguard' }])
  })

  it('starts the booking name blank again after being cancelled with data in it', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Booking name').setValue('VANG')

    await button(wrapper, 'Cancel').trigger('click')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Booking name').props('modelValue')).toBeFalsy()
  })

  it('presents Save as a filled primary action, and Cancel as a plain one', () => {
    const wrapper = mountDialog()

    expect(button(wrapper, 'Save').classes()).toContain('bg-primary')
    expect(button(wrapper, 'Save').classes()).toContain('v-btn--variant-flat')
    expect(button(wrapper, 'Cancel').classes()).not.toContain('bg-primary')
  })

  it('starts blank again after being cancelled with data in it', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Vanguard')

    await button(wrapper, 'Cancel').trigger('click')
    expect(wrapper.emitted('save')).toBeUndefined()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Name').props('modelValue')).toBeFalsy()
  })

  it('starts blank again after a save', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Vanguard')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(field(wrapper, 'Name').props('modelValue')).toBeFalsy()
  })

  it('shows a save failure without discarding what was typed', async () => {
    const wrapper = mountDialog({ error: 'The asset could not be saved.' })
    await field(wrapper, 'Name').setValue('Vanguard')

    expect(wrapper.findComponent(VAlert).text()).toContain('could not be saved')
    expect(field(wrapper, 'Name').props('modelValue')).toBe('Vanguard')
  })

  it('says nothing when there is no failure', () => {
    expect(mountDialog().findComponent(VAlert).exists()).toBe(false)
  })

  it('announces a save failure rather than only showing it', () => {
    const alert = mountDialog({ error: 'The asset could not be saved.' }).findComponent(VAlert)

    expect(alert.attributes('role')).toBe('alert')
  })

  it('names itself for assistive technology', () => {
    mountDialog()

    const dialog = document.querySelector('[role="dialog"]')
    const labelId = dialog?.getAttribute('aria-labelledby')

    expect(labelId).toBe('investment-income-new-asset-title')
    expect(document.getElementById(labelId as string)?.textContent?.trim()).toBe('New asset')
  })

  it('titles the dialog with a heading below the app’s own', () => {
    mountDialog()

    expect(document.getElementById('investment-income-new-asset-title')?.tagName).toBe('H2')
  })

  it('takes the whole screen on a phone, and a panel on a desktop', () => {
    expect(mountAtWidth(320).findComponent(VDialog).props('fullscreen')).toBe(true)
    expect(mountAtWidth(1280).findComponent(VDialog).props('fullscreen')).toBe(false)
  })

  it('blocks Save while a save is already in flight', async () => {
    const wrapper = mountDialog({ saving: true })
    await field(wrapper, 'Name').setValue('Vanguard')

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
})

describe('NewAssetDialog — validation', () => {
  it('says nothing is wrong until the user tries to save', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    expect(messagesOf(wrapper, 'Name')).toHaveLength(0)
  })

  it('saves nothing and marks the name when it is empty', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(true)
    expect(messagesOf(wrapper, 'Name').join()).toBe('A name is required.')
  })

  it('lets the asset through once a name is given', async () => {
    const wrapper = mountDialog()
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('save')).toBeUndefined()

    await field(wrapper, 'Name').setValue('Vanguard')
    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(messagesOf(wrapper, 'Name')).toHaveLength(0)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('saves nothing and marks an over-long booking name', async () => {
    const wrapper = mountDialog()
    await field(wrapper, 'Name').setValue('Vanguard')
    await field(wrapper, 'Booking name').setValue('x'.repeat(201))

    await button(wrapper, 'Save').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(messagesOf(wrapper, 'Booking name').join()).toMatch(/200 characters or fewer/)
  })
})
