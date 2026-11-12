import { createWriteStream, type ReadStream } from 'node:fs'
import { chmod, mkdir, open, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { create as createTar } from 'tar'
import { ErrorCodes } from '@amber-hub/shared'
import { getBackupStoragePath } from '../../config/env'
import { getDb } from '../../db/mongoClient'
import { AppError } from '../../errors/AppError'
import * as backupRepository from '../../repositories/backup/backupRepository'
import type { Backup } from './backup.types'

const MANIFEST_FORMAT_VERSION = 1
const ARCHIVE_SUFFIX = '.tar.gz'
const WORK_SUFFIX = '.work'
const FAILED_MESSAGE = 'The backup could not be created'
const INTERRUPTED_MESSAGE = 'The backup was interrupted by a restart'
const FILE_MISSING_MESSAGE = 'The backup file is missing'

export interface BackupDownload {
  stream: ReadStream
  sizeBytes: number
  fileName: string
}

export async function createBackup(createdByUsername: string): Promise<Backup> {
  let backup: Backup
  try {
    backup = await backupRepository.createInProgress(createdByUsername, new Date())
  } catch (error) {
    if (error instanceof backupRepository.BackupInProgressError) {
      throw inProgressError('A backup is already in progress')
    }
    throw error
  }

  void runBackup(backup)
  return backup
}

export async function listBackups(): Promise<Backup[]> {
  return backupRepository.findAll()
}

export async function deleteBackup(id: string): Promise<void> {
  const backup = await backupRepository.findById(id)
  if (!backup) {
    throw notFoundError()
  }
  if (backup.status === 'in_progress') {
    throw inProgressError('This backup is still being created')
  }

  await rm(archivePath(id), { force: true })
  await backupRepository.deleteById(id)
}

export async function openBackupDownload(id: string): Promise<BackupDownload> {
  const backup = await backupRepository.findById(id)
  if (!backup || backup.status !== 'ready') {
    throw notFoundError()
  }

  let handle
  try {
    handle = await open(archivePath(id), 'r')
  } catch (error) {
    if (isNotFound(error)) {
      throw notFoundError()
    }
    throw error
  }

  try {
    const { size } = await handle.stat()
    return { stream: handle.createReadStream(), sizeBytes: size, fileName: downloadFileName(backup) }
  } catch (error) {
    await handle.close()
    throw error
  }
}

export async function recoverBackups(): Promise<void> {
  await backupRepository.markAllInProgressFailed(INTERRUPTED_MESSAGE, new Date())
  try {
    await sweepStorage()
  } catch (error) {
    console.error('Backup storage recovery failed', error)
  }
}

export function downloadFileName(backup: Backup): string {
  const timestamp = backup.createdAt.toISOString().slice(0, 19).replace(/:/g, '-')
  return `amber-hub-backup-${timestamp}Z${ARCHIVE_SUFFIX}`
}

async function runBackup(backup: Backup): Promise<void> {
  const storagePath = getBackupStoragePath()
  const workDir = join(storagePath, `${backup.id}${WORK_SUFFIX}`)
  const finalPath = archivePath(backup.id)

  try {
    await ensureStorageDir(storagePath)
    await mkdir(workDir, { mode: 0o700 })

    const db = getDb()
    const dumpDir = join(workDir, 'dump', db.databaseName)
    await mkdir(dumpDir, { recursive: true })

    const collections: { name: string; documentCount: number }[] = []
    for (const name of await listBackupCollections()) {
      const documentCount = await dumpCollection(name, join(dumpDir, `${encodeURIComponent(name)}.bson`))
      collections.push({ name, documentCount })
    }

    const manifest = {
      formatVersion: MANIFEST_FORMAT_VERSION,
      createdAt: backup.createdAt.toISOString(),
      databaseName: db.databaseName,
      collections,
    }
    await writeFile(join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 })

    const workArchive = join(workDir, `archive${ARCHIVE_SUFFIX}`)
    await createTar(
      { gzip: true, portable: true, cwd: workDir, file: workArchive, maxReadSize: 65536 },
      ['manifest.json', 'dump'],
    )
    await chmod(workArchive, 0o600)
    await rename(workArchive, finalPath)
    await rm(workDir, { recursive: true, force: true })

    const { size } = await stat(finalPath)
    await backupRepository.markReady(backup.id, size, new Date())
  } catch (error) {
    console.error(`Backup ${backup.id} failed`, error)
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
    await rm(finalPath, { force: true }).catch(() => {})
    await backupRepository
      .markFailed(backup.id, FAILED_MESSAGE, new Date())
      .catch((markError) => console.error(`Could not mark backup ${backup.id} as failed`, markError))
  }
}

async function listBackupCollections(): Promise<string[]> {
  const collections = await getDb().listCollections({}, { nameOnly: true }).toArray()
  return collections
    .filter(
      (collection) =>
        collection.type === 'collection' &&
        collection.name !== backupRepository.BACKUPS_COLLECTION &&
        !collection.name.startsWith('system.'),
    )
    .map((collection) => collection.name)
    .sort()
}

async function dumpCollection(name: string, filePath: string): Promise<number> {
  let documentCount = 0
  const cursor = getDb().collection(name).find({}, { raw: true })

  async function* documents(): AsyncGenerator<Uint8Array> {
    for await (const document of cursor) {
      documentCount++
      yield document as unknown as Uint8Array
    }
  }

  await pipeline(documents(), createWriteStream(filePath, { mode: 0o600 }))
  return documentCount
}

async function sweepStorage(): Promise<void> {
  const storagePath = getBackupStoragePath()
  await ensureStorageDir(storagePath)

  const readyIds = new Set(
    (await backupRepository.findAll()).filter((b) => b.status === 'ready').map((b) => b.id),
  )
  const entries = await readdir(storagePath)

  for (const entry of entries) {
    const isWorkDir = entry.endsWith(WORK_SUFFIX)
    const isOrphanArchive =
      entry.endsWith(ARCHIVE_SUFFIX) && !readyIds.has(entry.slice(0, -ARCHIVE_SUFFIX.length))
    if (isWorkDir || isOrphanArchive) {
      await rm(join(storagePath, entry), { recursive: true, force: true })
    }
  }

  const present = new Set(entries)
  for (const id of readyIds) {
    if (!present.has(`${id}${ARCHIVE_SUFFIX}`)) {
      await backupRepository.markFailed(id, FILE_MISSING_MESSAGE, new Date())
    }
  }
}

async function ensureStorageDir(storagePath: string): Promise<void> {
  await mkdir(storagePath, { recursive: true, mode: 0o700 })
  await chmod(storagePath, 0o700)
}

function archivePath(id: string): string {
  return join(getBackupStoragePath(), `${id}${ARCHIVE_SUFFIX}`)
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

function notFoundError(): AppError {
  return new AppError(ErrorCodes.NOT_FOUND, 'Backup not found', 404)
}

function inProgressError(message: string): AppError {
  return new AppError(ErrorCodes.BACKUP_IN_PROGRESS, message, 409)
}
