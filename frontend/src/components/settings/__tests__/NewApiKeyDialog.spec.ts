import { describe, it, expect } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VTextField } from 'vuetify/components/VTextField'
import { VSelect } from 'vuetify/components/VSelect'
import { VBtn } from 'vuetify/components/VBtn'
import { VAlert } from 'vuetify/components/VAlert'
import NewApiKeyDialog from '../NewApiKeyDialog.vue'

// The dialog teleports its content out of the wrapper's DOM, so everything below queries the
// component tree rather than rendered HTML.
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(NewApiKeyDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function description(wrapper: VueWrapper) {
  const found = wrapper
    .findAllComponents(VTextField)
    .find((candidate) => candidate.props('label') === 'Description')

  if (!found) throw new Error('no Description field')
  return found
}

function validity(wrapper: VueWrapper) {
  const found = wrapper
    .findAllComponents(VSelect)
    .find((candidate) => candidate.props('label') === 'Validity')

  if (!found) throw new Error('no Validity select')
  return found
}

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === text)

  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

describe('NewApiKeyDialog fields', () => {
  it('offers a description field and a validity select', () => {
    const wrapper = mountDialog()

    expect(description(wrapper).exists()).toBe(true)
    expect(validity(wrapper).exists()).toBe(true)
  })

  it('opens with an empty description', () => {
    expect(description(mountDialog()).props('modelValue')).toBe('')
  })

  it('offers exactly 30, 60 and 90 days', () => {
    const items = validity(mountDialog()).props('items') as { title: string; value: number }[]

    expect(items.map((item) => item.title)).toEqual(['30 days', '60 days', '90 days'])
    expect(items.map((item) => item.value)).toEqual([30, 60, 90])
  })

  it('preselects 30 days', () => {
    expect(validity(mountDialog()).props('modelValue')).toBe(30)
  })
})

describe('NewApiKeyDialog submission', () => {
  it('emits create with the selected validity and no description', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Create').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('create')?.[0]).toEqual([{ validityDays: 30 }])
  })

  it('emits create with the chosen validity and description', async () => {
    const wrapper = mountDialog()

    await description(wrapper).setValue('CI pipeline')
    await validity(wrapper).setValue(60)
    await button(wrapper, 'Create').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('create')?.[0]).toEqual([
      { validityDays: 60, description: 'CI pipeline' },
    ])
  })

  it('trims the description and omits it when it is only whitespace', async () => {
    const wrapper = mountDialog()

    await description(wrapper).setValue('   ')
    await button(wrapper, 'Create').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('create')?.[0]).toEqual([{ validityDays: 30 }])
  })

  it('does not emit create when the description exceeds 200 characters', async () => {
    const wrapper = mountDialog()

    await description(wrapper).setValue('x'.repeat(201))
    await button(wrapper, 'Create').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('accepts a description of exactly 200 characters', async () => {
    const wrapper = mountDialog()

    await description(wrapper).setValue('x'.repeat(200))
    await button(wrapper, 'Create').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('create')).toBeTruthy()
  })

  it('emits update:modelValue false when cancelled', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('create')).toBeUndefined()
  })
})

describe('NewApiKeyDialog while saving', () => {
  it('disables and spins the create button', () => {
    const wrapper = mountDialog({ saving: true })

    expect(button(wrapper, 'Create').props('disabled')).toBe(true)
    expect(button(wrapper, 'Create').props('loading')).toBe(true)
  })

  it('leaves the create button active when idle', () => {
    expect(button(mountDialog(), 'Create').props('disabled')).toBe(false)
  })
})

describe('NewApiKeyDialog error handling', () => {
  it('shows the error message without clearing the inputs', async () => {
    const wrapper = mountDialog()
    await description(wrapper).setValue('CI pipeline')
    await validity(wrapper).setValue(90)

    await wrapper.setProps({ error: 'The API key could not be created.' })

    expect(wrapper.findComponent(VAlert).text()).toContain('could not be created')
    expect(description(wrapper).props('modelValue')).toBe('CI pipeline')
    expect(validity(wrapper).props('modelValue')).toBe(90)
  })

  it('shows no alert when there is no error', () => {
    expect(mountDialog().findComponent(VAlert).exists()).toBe(false)
  })
})

describe('NewApiKeyDialog reset', () => {
  it('clears the inputs back to their defaults when the dialog closes', async () => {
    const wrapper = mountDialog()
    await description(wrapper).setValue('CI pipeline')
    await validity(wrapper).setValue(90)

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(description(wrapper).props('modelValue')).toBe('')
    expect(validity(wrapper).props('modelValue')).toBe(30)
  })
})
