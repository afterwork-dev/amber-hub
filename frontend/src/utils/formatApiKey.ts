export function formatApiKeyDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

export function formatApiKeyDescription(description: string): string {
  return description === '' ? 'No description' : description
}

export type ApiKeyStatus = 'active' | 'expired'

export function apiKeyStatus(expiresAt: string, now: Date = new Date()): ApiKeyStatus {
  return Date.parse(expiresAt) <= now.getTime() ? 'expired' : 'active'
}
