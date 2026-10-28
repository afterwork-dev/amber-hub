import { createReadStream } from 'node:fs'
import { extname } from 'node:path'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiResponse } from '@amber-hub/shared'
import { listApps } from '../../services/apps/appListService'
import { resolveAppFile } from '../../services/apps/appFileService'

interface AppListResponse {
  apps: {
    id: string
    displayName: string
    frontend: { entry: string } | null
    backend: { entry: string } | null
  }[]
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function mimeTypeFor(filePath: string): string {
  return MIME_TYPES_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

export async function listAppsHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apps = await listApps()

  const body: ApiResponse<AppListResponse> = {
    success: true,
    data: { apps },
    error: null,
  }
  reply.status(200).send(body)
}

export async function getAppFileHandler(
  request: FastifyRequest<{ Params: { appId: string; '*': string } }>,
  reply: FastifyReply,
): Promise<NodeJS.ReadableStream> {
  const { appId } = request.params
  const filePath = request.params['*']

  const resolvedPath = await resolveAppFile(appId, filePath)

  reply.status(200).type(mimeTypeFor(resolvedPath))
  return createReadStream(resolvedPath)
}
