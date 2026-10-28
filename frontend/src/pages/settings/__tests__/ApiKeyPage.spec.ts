import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VToolbar } from 'vuetify/components/VToolbar'
import ApiKeyPage from '../ApiKeyPage.vue'
import ApiKeyRevealDialog from '../../../components/settings/ApiKeyRevealDialog.vue'
import NewApiKeyDialog from '../../../components/settings/NewApiKeyDialog.vue'
import ApiKeyList from '../../../components/settings/ApiKeyList.vue'
import DeleteApiKeyDialog from '../../../components/settings/DeleteApiKeyDialog.vue'

vi.mock('../../../services/apiKeyService', () => ({
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  deleteApiKey: vi.fn(),
}))

import { createApiKey, deleteApiKey, listApiKeys } from '../../../services/apiKeyService'

const created = {
  id: 'key-1',
  key: 'ahk_abc',
  description: 'CI',
  createdAt: '2026-08-31T10:00:00.000Z',
  expiresAt: '2026-09-30T10:00:00.000Z',
}

function mountPage() {
  return mount(ApiKeyPage, { global: { plugins: [createVuetify({ theme: false })] } })
}

function newButton(wrapper: VueWrapper) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === 'New')

  if (!found) throw new Error('no New button')
  return found
}

function dialog(wrapper: VueWrapper) {
  return wrapper.findComponent(NewApiKeyDialog)
}

function reveal(wrapper: VueWrapper) {
  return wrapper.findComponent(ApiKeyRevealDialog)
}

async function createKey(wrapper: VueWrapper) {
  await newButton(wrapper).trigger('click')
  dialog(wrapper).vm.$emit('create', { validityDays: 30 })
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listApiKeys).mockResolvedValue([])
})

function list(wrapper: VueWrapper) {
  return wrapper.findComponent(ApiKeyList)
}

function deleteDialog(wrapper: VueWrapper) {
  return wrapper.findComponent(DeleteApiKeyDialog)
}

const existingKey = {
  id: 'existing',
  description: 'old key',
  createdAt: '2026-07-01T10:00:00.000Z',
  expiresAt: '2026-08-30T10:00:00.000Z',
}

describe('ApiKeyPage list', () => {
  it('loads the key list on mount', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(listApiKeys).toHaveBeenCalledTimes(1)
    expect(list(wrapper).exists()).toBe(true)
  })

  it('adds a newly created key to the list', async () => {
    vi.mocked(createApiKey).mockResolvedValue(created)
    const wrapper = mountPage()
    await flushPromises()

    await createKey(wrapper)

    const shown = list(wrapper).props('apiKeys') as Array<{ id: string; description: string }>
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatchObject({ id: created.id, description: created.description })
    expect(JSON.stringify(shown)).not.toContain(created.key)
  })
})

describe('ApiKeyPage delete', () => {
  async function mountWithKey() {
    vi.mocked(listApiKeys).mockResolvedValue([existingKey])
    const wrapper = mountPage()
    await flushPromises()
    return wrapper
  }

  it('keeps the delete dialog closed until a row requests deletion', async () => {
    const wrapper = await mountWithKey()

    expect(deleteDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('opens the delete dialog for the requested key', async () => {
    const wrapper = await mountWithKey()

    list(wrapper).vm.$emit('delete', existingKey)
    await flushPromises()

    expect(deleteDialog(wrapper).props('modelValue')).toBe(true)
    expect(deleteDialog(wrapper).props('apiKey')).toEqual(existingKey)
  })

  it('removes the row and closes the dialog after a confirmed delete', async () => {
    vi.mocked(deleteApiKey).mockResolvedValue(undefined)
    const wrapper = await mountWithKey()
    list(wrapper).vm.$emit('delete', existingKey)
    await flushPromises()

    deleteDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(deleteApiKey).toHaveBeenCalledWith(existingKey.id)
    expect(list(wrapper).props('apiKeys')).toHaveLength(0)
    expect(deleteDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('keeps the row and the dialog open when the delete fails', async () => {
    vi.mocked(deleteApiKey).mockRejectedValue(new Error('boom'))
    const wrapper = await mountWithKey()
    list(wrapper).vm.$emit('delete', existingKey)
    await flushPromises()

    deleteDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(list(wrapper).props('apiKeys')).toHaveLength(1)
    expect(deleteDialog(wrapper).props('modelValue')).toBe(true)
    expect(deleteDialog(wrapper).props('error')).toBeTruthy()
  })
})

describe('ApiKeyPage bar', () => {
  it('shows a bar titled "API Keys"', () => {
    const wrapper = mountPage()

    expect(wrapper.findComponent(VToolbar).exists()).toBe(true)
    expect(wrapper.findComponent(VToolbar).text()).toContain('API Keys')
  })

  it('offers a primary "New" button in the bar', () => {
    const button = newButton(mountPage())

    expect(button.props('color')).toBe('primary')
    expect(button.props('variant')).toBe('flat')
  })
})

describe('ApiKeyPage dialog', () => {
  it('keeps the dialog closed until New is clicked', () => {
    expect(dialog(mountPage()).props('modelValue')).toBe(false)
  })

  it('opens the dialog when New is clicked', async () => {
    const wrapper = mountPage()

    await newButton(wrapper).trigger('click')

    expect(dialog(wrapper).props('modelValue')).toBe(true)
  })

  it('closes the dialog after a successful creation', async () => {
    vi.mocked(createApiKey).mockResolvedValue(created)
    const wrapper = mountPage()
    await newButton(wrapper).trigger('click')

    dialog(wrapper).vm.$emit('create', { validityDays: 30 })
    await flushPromises()

    expect(createApiKey).toHaveBeenCalledWith({ validityDays: 30 })
    expect(dialog(wrapper).props('modelValue')).toBe(false)
  })

  it('keeps the dialog open and passes the error down when creation fails', async () => {
    vi.mocked(createApiKey).mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()
    await newButton(wrapper).trigger('click')

    dialog(wrapper).vm.$emit('create', { validityDays: 30 })
    await flushPromises()

    expect(dialog(wrapper).props('modelValue')).toBe(true)
    expect(dialog(wrapper).props('error')).toContain('could not be created')
  })

  it('clears a previous error when the dialog is reopened', async () => {
    vi.mocked(createApiKey).mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()
    await newButton(wrapper).trigger('click')
    dialog(wrapper).vm.$emit('create', { validityDays: 30 })
    await flushPromises()

    await newButton(wrapper).trigger('click')

    expect(dialog(wrapper).props('error')).toBeNull()
  })
})

describe('ApiKeyPage one-time reveal', () => {
  it('keeps the reveal dialog closed before any key is created', () => {
    expect(reveal(mountPage()).props('modelValue')).toBe(false)
  })

  it('opens the reveal dialog with the created key', async () => {
    vi.mocked(createApiKey).mockResolvedValue(created)
    const wrapper = mountPage()

    await createKey(wrapper)

    expect(reveal(wrapper).props('modelValue')).toBe(true)
    expect(reveal(wrapper).props('apiKey')).toBe(created.key)
  })

  it('destroys the plaintext key when the reveal dialog is dismissed', async () => {
    vi.mocked(createApiKey).mockResolvedValue(created)
    const wrapper = mountPage()
    await createKey(wrapper)

    reveal(wrapper).vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(reveal(wrapper).props('modelValue')).toBe(false)
    expect(reveal(wrapper).props('apiKey')).toBe('')
  })

  it('does not open the reveal dialog when creation fails', async () => {
    vi.mocked(createApiKey).mockRejectedValue(new Error('boom'))
    const wrapper = mountPage()

    await createKey(wrapper)

    expect(reveal(wrapper).props('modelValue')).toBe(false)
  })
})
