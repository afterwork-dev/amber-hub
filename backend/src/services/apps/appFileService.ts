import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { AppError } from '../../errors/AppError'
import { getAppsStoragePath } from '../../config/env'
import { isPathWithin } from '../../utils/pathSafety'

export async function resolveAppFile(appId: string, filePath: string): Promise<string> {
  const appDir = join(getAppsStoragePath(), appId)

  try {
    await access(appDir)
  } catch {
    throw new AppError('APP_NOT_FOUND', `No installed app with id "${appId}" was found.`, 404)
  }

  const resolvedPath = join(appDir, filePath)

  if (!isPathWithin(appDir, resolvedPath)) {
    throw new AppError('APP_FILE_NOT_FOUND', 'The requested app file could not be found.', 404)
  }

  try {
    await access(resolvedPath)
  } catch {
    throw new AppError('APP_FILE_NOT_FOUND', 'The requested app file could not be found.', 404)
  }

  return resolvedPath
}
