import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
import { HttpClientError, renewSession } from '../services/httpClient'
import {
  backupDownloadUrl,
  createBackup,
  deleteBackup,
  listBackups,
  type BackupSummary,
} from '../services/backupService'

export const POLL_INTERVAL_MS = 3000

const LOAD_FAILED = 'Your backups could not be loaded. Check your connection and try again.'
const CREATE_FAILED = 'The backup could not be started. Check your connection and try again.'
const DELETE_FAILED = 'The backup could not be deleted. Check your connection and try again.'
const SESSION_EXPIRED = 'Your session has expired. Sign in again to download the backup.'

export function useBackups() {
  const backups = ref<BackupSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const creating = ref(false)
  const actionError = ref<string | null>(null)
  const deleting = ref(false)
  const deleteError = ref<string | null>(null)

  const inProgress = computed(() => backups.value.some((b) => b.status === 'in_progress'))
  const settledBackups = computed(() => backups.value.filter((b) => b.status !== 'in_progress'))

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let latestRequest = 0
  let stopped = false

  async function fetchList(): Promise<void> {
    const request = ++latestRequest
    const result = await listBackups()
    if (request === latestRequest) {
      backups.value = result
    }
  }

  function schedulePoll(): void {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    if (stopped || !inProgress.value) {
      return
    }
    pollTimer = setTimeout(async () => {
      pollTimer = null
      await fetchList().catch(() => {})
      schedulePoll()
    }, POLL_INTERVAL_MS)
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await fetchList()
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
    schedulePoll()
  }

  async function create(): Promise<boolean> {
    creating.value = true
    actionError.value = null

    try {
      const created = await createBackup()
      latestRequest++
      backups.value = [created, ...backups.value]
      return true
    } catch (thrown) {
      if (thrown instanceof HttpClientError && thrown.errorCode === 'BACKUP_IN_PROGRESS') {
        await fetchList().catch(() => {})
      } else {
        actionError.value = thrown instanceof HttpClientError ? thrown.message : CREATE_FAILED
      }
      return false
    } finally {
      creating.value = false
      schedulePoll()
    }
  }

  async function remove(id: string): Promise<boolean> {
    deleting.value = true
    deleteError.value = null

    try {
      await deleteBackup(id)
    } catch (thrown) {
      if (!(thrown instanceof HttpClientError && thrown.errorCode === 'NOT_FOUND')) {
        deleteError.value = thrown instanceof HttpClientError ? thrown.message : DELETE_FAILED
        return false
      }
    } finally {
      deleting.value = false
    }

    latestRequest++
    backups.value = backups.value.filter((b) => b.id !== id)
    return true
  }

  async function download(backup: BackupSummary): Promise<void> {
    actionError.value = null
    if (!(await renewSession())) {
      actionError.value = SESSION_EXPIRED
      return
    }

    const link = document.createElement('a')
    link.href = backupDownloadUrl(backup.id)
    link.download = ''
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function stop(): void {
    stopped = true
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(stop)
  }

  return {
    backups,
    settledBackups,
    inProgress,
    loading,
    error,
    creating,
    actionError,
    deleting,
    deleteError,
    load,
    create,
    remove,
    download,
    stop,
  }
}
