import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { POLL_INTERVAL_MS, useBackups } from '../useBackups'
import { HttpClientError } from '../../services/httpClient'

vi.mock('../../services/backupService', () => ({
  createBackup: vi.fn(),
  listBackups: vi.fn(),
  deleteBackup: vi.fn(),
  backupDownloadUrl: (id: string) => `http://api.test/api/backups/${id}/download`,
}))

vi.mock('../../services/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/httpClient')>()),
  renewSession: vi.fn(),
}))

import { createBackup, deleteBackup, listBackups } from '../../services/backupService'
import { renewSession } from '../../services/httpClient'

const backup = (id: string, status: 'in_progress' | 'ready' | 'failed') => ({
  id,
  status,
  createdAt: '2026-11-11T10:00:00.000Z',
  completedAt: status === 'in_progress' ? null : '2026-11-11T10:01:00.000Z',
  createdByUsername: 'alice',
  sizeBytes: status === 'ready' ? 2048 : null,
  errorMessage: status === 'failed' ? 'The backup could not be created' : null,
})

describe('useBackups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the list and hides in-progress backups from settledBackups', async () => {
    vi.mocked(listBackups).mockResolvedValue([backup('a', 'in_progress'), backup('b', 'ready')])
    const { load, settledBackups, inProgress, stop } = useBackups()

    await load()

    expect(inProgress.value).toBe(true)
    expect(settledBackups.value.map((b) => b.id)).toEqual(['b'])
    stop()
  })

  it('sets an error when the list cannot be loaded', async () => {
    vi.mocked(listBackups).mockRejectedValue(new Error('offline'))
    const { load, error, loading } = useBackups()

    await load()

    expect(error.value).toMatch(/could not be loaded/)
    expect(loading.value).toBe(false)
  })

  it('polls while a backup is in progress and stops once it is ready', async () => {
    vi.mocked(listBackups)
      .mockResolvedValueOnce([backup('a', 'in_progress')])
      .mockResolvedValueOnce([backup('a', 'ready')])
    const { load, inProgress, loading } = useBackups()

    await load()
    expect(listBackups).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

    expect(listBackups).toHaveBeenCalledTimes(2)
    expect(inProgress.value).toBe(false)
    expect(loading.value).toBe(false)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(listBackups).toHaveBeenCalledTimes(2)
  })

  it('does not poll when nothing is in progress', async () => {
    vi.mocked(listBackups).mockResolvedValue([backup('b', 'ready')])
    const { load } = useBackups()

    await load()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)

    expect(listBackups).toHaveBeenCalledTimes(1)
  })

  it('stops polling when its scope is disposed', async () => {
    vi.mocked(listBackups).mockResolvedValue([backup('a', 'in_progress')])
    const scope = effectScope()
    const backups = scope.run(() => useBackups())!

    await backups.load()
    scope.stop()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)

    expect(listBackups).toHaveBeenCalledTimes(1)
  })

  it('adds a created backup and starts polling', async () => {
    vi.mocked(listBackups).mockResolvedValue([])
    vi.mocked(createBackup).mockResolvedValue(backup('new', 'in_progress'))
    const { load, create, inProgress, stop } = useBackups()
    await load()

    expect(await create()).toBe(true)
    expect(inProgress.value).toBe(true)

    vi.mocked(listBackups).mockResolvedValue([backup('new', 'ready')])
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(inProgress.value).toBe(false)
    stop()
  })

  it('refreshes the list without an error when another backup is already running', async () => {
    vi.mocked(createBackup).mockRejectedValue(
      new HttpClientError('A backup is already in progress', 'BACKUP_IN_PROGRESS'),
    )
    vi.mocked(listBackups).mockResolvedValue([backup('other', 'in_progress')])
    const { create, inProgress, actionError, stop } = useBackups()

    expect(await create()).toBe(false)

    expect(actionError.value).toBeNull()
    expect(inProgress.value).toBe(true)
    stop()
  })

  it('removes a deleted backup, also when it was already gone', async () => {
    vi.mocked(listBackups).mockResolvedValue([backup('a', 'ready'), backup('b', 'failed')])
    const { load, remove, backups } = useBackups()
    await load()

    vi.mocked(deleteBackup).mockResolvedValueOnce()
    expect(await remove('a')).toBe(true)
    vi.mocked(deleteBackup).mockRejectedValueOnce(new HttpClientError('Backup not found', 'NOT_FOUND'))
    expect(await remove('b')).toBe(true)

    expect(backups.value).toEqual([])
  })

  it('keeps the backup and reports the error when delete fails', async () => {
    vi.mocked(listBackups).mockResolvedValue([backup('a', 'ready')])
    vi.mocked(deleteBackup).mockRejectedValue(
      new HttpClientError('This backup is still being created', 'BACKUP_IN_PROGRESS'),
    )
    const { load, remove, backups, deleteError } = useBackups()
    await load()

    expect(await remove('a')).toBe(false)

    expect(deleteError.value).toBe('This backup is still being created')
    expect(backups.value).toHaveLength(1)
  })

  it('renews the session, then downloads through a link', async () => {
    vi.mocked(renewSession).mockResolvedValue(true)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { download, actionError } = useBackups()

    await download(backup('a', 'ready'))

    expect(click).toHaveBeenCalledTimes(1)
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.href).toBe('http://api.test/api/backups/a/download')
    expect(actionError.value).toBeNull()
    click.mockRestore()
  })

  it('does not download when the session cannot be renewed', async () => {
    vi.mocked(renewSession).mockResolvedValue(false)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { download, actionError } = useBackups()

    await download(backup('a', 'ready'))

    expect(click).not.toHaveBeenCalled()
    expect(actionError.value).toMatch(/session has expired/)
    click.mockRestore()
  })
})
