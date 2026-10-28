import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VAlert } from 'vuetify/components/VAlert'
import { VCard } from 'vuetify/components/VCard'
import DeleteApiKeyDialog from '../DeleteApiKeyDialog.vue'
import { formatApiKeyDate } from '../../../utils/formatApiKey'

const apiKey = {
  id: 'k1',
  description: 'CI pipeline',
  createdAt: '2026-08-31T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
}

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(DeleteApiKeyDialog, {
    props: { modelValue: true, apiKey, deleting: false, error: null, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper.findAllComponents(VBtn).find((candidate) => candidate.props('text') === text)
  if (!found) throw new Error(`no ${text} button`)
  return found
}

describe('DeleteApiKeyDialog', () => {
  it('names the key by description and creation date, and warns it is permanent', () => {
    const text = mountDialog().findComponent(VCard).text()

    expect(text).toContain('CI pipeline')
    expect(text).toContain(formatApiKeyDate(apiKey.createdAt))
    expect(text.toLowerCase()).toContain('undone')
  })

  it('shows the placeholder for a key with an empty description', () => {
    const text = mountDialog({ apiKey: { ...apiKey, description: '' } })
      .findComponent(VCard)
      .text()

    expect(text).toContain('No description')
  })

  it('emits confirm when Delete is clicked', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Delete').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('closes without confirming when Cancel is clicked', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('disables and spins the confirm button while deleting', () => {
    const confirm = button(mountDialog({ deleting: true }), 'Delete')

    expect(confirm.props('disabled')).toBe(true)
    expect(confirm.props('loading')).toBe(true)
  })

  it('shows an error alert without closing', () => {
    const wrapper = mountDialog({ error: 'The API key could not be deleted.' })

    expect(wrapper.findComponent(VAlert).exists()).toBe(true)
    expect(wrapper.findComponent(VAlert).text()).toContain('could not be deleted')
  })
})
