import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { getAppsStoragePath } from '../../config/env'
import type { AppManifest } from './apps.types'

const MANIFEST_FILENAME = 'manifest.json'
const APP_ID_PATTERN = /^[a-z0-9-]+$/

export interface AppMetadata {
  id: string
  displayName: string
  frontend: { entry: string } | null
  backend: { entry: string } | null
}

function isValidManifest(parsed: Partial<AppManifest>): parsed is AppManifest {
  return (
    typeof parsed.id === 'string' &&
    APP_ID_PATTERN.test(parsed.id) &&
    typeof parsed.displayName === 'string' &&
    parsed.displayName.trim() !== ''
  )
}

async function readApp(appsStoragePath: string, dirName: string): Promise<AppMetadata | null> {
  let raw: string
  try {
    raw = await readFile(join(appsStoragePath, dirName, MANIFEST_FILENAME), 'utf-8')
  } catch {
    return null
  }

  let parsed: Partial<AppManifest>
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(`Skipping installed app "${dirName}": manifest.json is not valid JSON`)
    return null
  }

  if (!isValidManifest(parsed)) {
    console.warn(`Skipping installed app "${dirName}": manifest.json failed validation`)
    return null
  }

  return {
    id: parsed.id,
    displayName: parsed.displayName,
    frontend: parsed.frontend ?? null,
    backend: parsed.backend ?? null,
  }
}

export async function listApps(): Promise<AppMetadata[]> {
  const appsStoragePath = getAppsStoragePath()

  let entries: string[]
  try {
    entries = await readdir(appsStoragePath, { withFileTypes: true }).then((dirents) =>
      dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name),
    )
  } catch {
    return []
  }

  const apps = await Promise.all(entries.map((dirName) => readApp(appsStoragePath, dirName)))
  return apps.filter((app): app is AppMetadata => app !== null)
}

export async function getApp(appId: string): Promise<AppMetadata | null> {
  return readApp(getAppsStoragePath(), appId)
}
