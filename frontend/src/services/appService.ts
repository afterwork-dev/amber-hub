import { httpGet } from './httpClient'

export interface AppMetadata {
  id: string
  displayName: string
  frontend: { entry: string } | null
}

export async function listApps(): Promise<AppMetadata[]> {
  const result = await httpGet<{ apps: AppMetadata[] }>('/apps')
  return result.apps
}

export function buildAppResourceUrl(appId: string, path: string): string {
  return `/resources/${appId}/frontend/${path}`
}
