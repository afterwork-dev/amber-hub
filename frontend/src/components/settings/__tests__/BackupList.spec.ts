import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VAlert } from 'vuetify/components/VAlert'
import { VBtn } from 'vuetify/components/VBtn'
import { VChip } from 'vuetify/components/VChip'
import { VDataTable } from 'vuetify/components/VDataTable'
import BackupList from '../BackupList.vue'

const ready = {
  id: 'r1',
  status: 'ready' as const,
  createdAt: '2026-11-11T10:00:00.000Z',
  completedAt: '2026-11-11T10:01:00.000Z',
  createdByUsername: 'alice',
  sizeBytes: 2048,
  errorMessage: null,
}

const failed = {
  ...ready,
  id: 'f1',
  status: 'failed' as const,
  sizeBytes: null,
  errorMessage: 'The backup could not be created',
}

function mountList(props: Record<string, unknown> = {}) {
  return mount(BackupList, {
    props: { backups: [ready, failed], loading: false, error: null, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function rowButtons(wrapper: ReturnType<typeof mountList>, rowIndex: number) {
  const row = wrapper.findAll('tbody tr')[rowIndex]!
  return row.findAllComponents(VBtn)
}

describe('BackupList', () => {
  it('shows a loading state', () => {
    const wrapper = mountList({ loading: true })

    expect(wrapper.text()).toContain('Loading backups')
    expect(wrapper.findComponent(VDataTable).exists()).toBe(false)
  })

  it('shows an error with a retry action', async () => {
    const wrapper = mountList({ error: 'Your backups could not be loaded.' })

    expect(wrapper.findComponent(VAlert).text()).toContain('Your backups could not be loaded.')
    await wrapper.findComponent(VBtn).trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('shows an empty state', () => {
    const wrapper = mountList({ backups: [] })

    expect(wrapper.text()).toContain('No backups yet')
  })

  it('shows size, creator and status for each backup', () => {
    const wrapper = mountList()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('alice')
    expect(rows[0]!.text()).toContain('2.0 KB')
    expect(wrapper.findAllComponents(VChip).map((chip) => chip.text())).toEqual(['Ready', 'Failed'])
  })

  it('offers download and delete for a ready backup', async () => {
    const wrapper = mountList()

    const buttons = rowButtons(wrapper, 0)
    expect(buttons.map((b) => b.attributes('aria-label'))).toEqual([
      expect.stringMatching(/^Download backup from /),
      expect.stringMatching(/^Delete backup from /),
    ])

    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('download')).toEqual([[ready]])
    expect(wrapper.emitted('delete')).toEqual([[ready]])
  })

  it('offers only delete for a failed backup', () => {
    const wrapper = mountList()

    const labels = rowButtons(wrapper, 1).map((b) => b.attributes('aria-label'))
    expect(labels).toEqual([expect.stringMatching(/^Delete backup from /)])
  })
})
