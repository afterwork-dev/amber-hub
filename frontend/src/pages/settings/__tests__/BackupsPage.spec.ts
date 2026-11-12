import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import BackupsPage from '../BackupsPage.vue'
import BackupList from '../../../components/settings/BackupList.vue'
import DeleteBackupDialog from '../../../components/settings/DeleteBackupDialog.vue'

vi.mock('../../../services/backupService', () => ({
  createBackup: vi.fn(),
  listBackups: vi.fn(),
  deleteBackup: vi.fn(),
  backupDownloadUrl: (id: string) => `/api/backups/${id}/download`,
}))

import { createBackup, deleteBackup, listBackups } from '../../../services/backupService'

const ready = {
  id: 'r1',
  status: 'ready' as const,
  createdAt: '2026-11-11T10:00:00.000Z',
  completedAt: '2026-11-11T10:01:00.000Z',
  createdByUsername: 'alice',
  sizeBytes: 2048,
  errorMessage: null,
}

const running = { ...ready, id: 'p1', status: 'in_progress' as const, completedAt: null, sizeBytes: null }

function mountPage() {
  return mount(BackupsPage, {
    global: { plugins: [createVuetify({ theme: false })] },
    attachTo: document.body,
  })
}

function newButton(wrapper: VueWrapper) {
  return wrapper.findAllComponents(VBtn).find((b) => b.props('text') === 'New')!
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listBackups).mockResolvedValue([ready])
})

describe('BackupsPage', () => {
  it('lists finished backups and enables New', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findComponent(BackupList).props('backups')).toEqual([ready])
    expect(newButton(wrapper).props('disabled')).toBe(false)
    expect(wrapper.text()).not.toContain('A backup is being created')
    wrapper.unmount()
  })

  it('shows an in-progress notice, keeps the running backup out of the list, and disables New', async () => {
    vi.mocked(listBackups).mockResolvedValue([running, ready])
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('A backup is being created')
    expect(wrapper.findComponent(BackupList).props('backups')).toEqual([ready])
    expect(newButton(wrapper).props('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('starts a backup from New', async () => {
    vi.mocked(createBackup).mockResolvedValue(running)
    const wrapper = mountPage()
    await flushPromises()

    await newButton(wrapper).trigger('click')
    await flushPromises()

    expect(createBackup).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('A backup is being created')
    expect(document.body.textContent).toContain('Backup started')
    wrapper.unmount()
  })

  it('deletes a backup after confirmation', async () => {
    vi.mocked(deleteBackup).mockResolvedValue()
    const wrapper = mountPage()
    await flushPromises()

    wrapper.findComponent(BackupList).vm.$emit('delete', ready)
    await flushPromises()
    expect(wrapper.findComponent(DeleteBackupDialog).props('modelValue')).toBe(true)

    wrapper.findComponent(DeleteBackupDialog).vm.$emit('confirm')
    await flushPromises()

    expect(deleteBackup).toHaveBeenCalledWith('r1')
    expect(wrapper.findComponent(BackupList).props('backups')).toEqual([])
    expect(wrapper.findComponent(DeleteBackupDialog).props('modelValue')).toBe(false)
    wrapper.unmount()
  })
})
