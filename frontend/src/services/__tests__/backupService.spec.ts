import { describe, it, expect, vi, beforeEach } from 'vitest'
import { backupDownloadUrl, createBackup, deleteBackup, listBackups } from '../backupService'

vi.mock('../httpClient', () => ({
  apiUrl: (path: string) => `http://api.test/api${path}`,
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpDelete: vi.fn(),
}))

import { httpDelete, httpGet, httpPost } from '../httpClient'

const backup = {
  id: 'b1',
  status: 'in_progress' as const,
  createdAt: '2026-11-11T10:00:00.000Z',
  completedAt: null,
  createdByUsername: 'alice',
  sizeBytes: null,
  errorMessage: null,
}

describe('backupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a backup by posting an empty body to /backups', async () => {
    vi.mocked(httpPost).mockResolvedValue(backup)

    expect(await createBackup()).toEqual(backup)
    expect(httpPost).toHaveBeenCalledWith('/backups', {})
  })

  it('lists backups from /backups', async () => {
    vi.mocked(httpGet).mockResolvedValue({ backups: [backup] })

    expect(await listBackups()).toEqual([backup])
    expect(httpGet).toHaveBeenCalledWith('/backups')
  })

  it('deletes a backup by id', async () => {
    vi.mocked(httpDelete).mockResolvedValue({ id: 'b1' })

    await deleteBackup('b1')

    expect(httpDelete).toHaveBeenCalledWith('/backups/b1')
  })

  it('builds the download URL from the API base', () => {
    expect(backupDownloadUrl('b1')).toBe('http://api.test/api/backups/b1/download')
  })
})
