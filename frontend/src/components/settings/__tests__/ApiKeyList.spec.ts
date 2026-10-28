import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VProgressCircular } from 'vuetify/components/VProgressCircular'
import { VAlert } from 'vuetify/components/VAlert'
import { VDataTable } from 'vuetify/components/VDataTable'
import { VBtn } from 'vuetify/components/VBtn'
import { VChip } from 'vuetify/components/VChip'
import ApiKeyList from '../ApiKeyList.vue'
import { formatApiKeyDate } from '../../../utils/formatApiKey'

const DAY = 24 * 60 * 60 * 1000

const keys = [
  {
    id: 'k1',
    description: 'CI pipeline',
    createdAt: '2026-08-01T10:00:00.000Z',
    expiresAt: '2026-09-30T10:00:00.000Z',
  },
  {
    id: 'k2',
    description: '',
    createdAt: '2026-07-01T10:00:00.000Z',
    expiresAt: '2026-08-30T10:00:00.000Z',
  },
]

function mountList(props: Record<string, unknown> = {}) {
  return mount(ApiKeyList, {
    props: { apiKeys: keys, loading: false, error: null, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function table(wrapper: VueWrapper) {
  return wrapper.findComponent(VDataTable)
}

describe('ApiKeyList states', () => {
  it('shows a loading indicator while loading', () => {
    const wrapper = mountList({ loading: true, apiKeys: [] })

    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true)
    expect(table(wrapper).exists()).toBe(false)
  })

  it('shows an error with a Retry action that emits retry', async () => {
    const wrapper = mountList({ error: 'Your API keys could not be loaded.', apiKeys: [] })

    const alert = wrapper.findComponent(VAlert)
    expect(alert.exists()).toBe(true)

    const retry = wrapper.findAllComponents(VBtn).find((btn) => btn.props('text') === 'Retry')
    await retry?.trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('shows an empty state when there are no keys', () => {
    const wrapper = mountList({ apiKeys: [] })

    expect(wrapper.text()).toContain('No API keys yet')
    expect(table(wrapper).exists()).toBe(false)
  })
})

describe('ApiKeyList table', () => {
  it('renders one row per key with the four columns', () => {
    const wrapper = mountList()

    expect(table(wrapper).exists()).toBe(true)
    expect(table(wrapper).props('items')).toHaveLength(2)
  })

  it('shows the placeholder for an empty description', () => {
    const wrapper = mountList()

    expect(wrapper.text()).toContain('No description')
    expect(wrapper.text()).toContain('CI pipeline')
  })

  it('formats the created and expires timestamps for the user', () => {
    const wrapper = mountList()

    expect(wrapper.text()).toContain(formatApiKeyDate(keys[0].createdAt))
    expect(wrapper.text()).toContain(formatApiKeyDate(keys[0].expiresAt))
  })
})

describe('ApiKeyList status', () => {
  const statusKeys = [
    {
      id: 'active',
      description: 'live',
      createdAt: new Date(Date.now() - DAY).toISOString(),
      expiresAt: new Date(Date.now() + 30 * DAY).toISOString(),
    },
    {
      id: 'expired',
      description: 'stale',
      createdAt: new Date(Date.now() - 90 * DAY).toISOString(),
      expiresAt: new Date(Date.now() - DAY).toISOString(),
    },
  ]

  it('marks a future-expiry key Active and a past-expiry key Expired', () => {
    const wrapper = mountList({ apiKeys: statusKeys })

    const chipText = wrapper.findAllComponents(VChip).map((chip) => chip.text())
    expect(chipText).toContain('Active')
    expect(chipText).toContain('Expired')
  })

  it('dims the expired row', () => {
    const wrapper = mountList({ apiKeys: statusKeys })

    expect(wrapper.html()).toContain('text-medium-emphasis')
  })
})

describe('ApiKeyList delete action', () => {
  it('offers a delete button per row that emits delete with the row', async () => {
    const wrapper = mountList()

    const deleteButtons = wrapper
      .findAllComponents(VBtn)
      .filter((btn) => String(btn.attributes('aria-label') ?? '').startsWith('Delete key'))

    expect(deleteButtons).toHaveLength(keys.length)

    await deleteButtons[0].trigger('click')

    expect(wrapper.emitted('delete')?.[0]).toEqual([keys[0]])
  })

  it('labels each delete button with the key’s description', () => {
    const wrapper = mountList()

    const labels = wrapper
      .findAllComponents(VBtn)
      .map((btn) => btn.attributes('aria-label'))
      .filter((label): label is string => Boolean(label?.startsWith('Delete key')))

    expect(labels).toContain('Delete key CI pipeline')
    expect(labels).toContain('Delete key No description')
  })
})
