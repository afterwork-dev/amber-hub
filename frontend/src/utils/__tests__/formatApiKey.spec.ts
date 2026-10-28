import { describe, it, expect } from 'vitest'
import { apiKeyStatus, formatApiKeyDate, formatApiKeyDescription } from '../formatApiKey'

describe('formatApiKeyDate', () => {
  it('renders a medium date and short time in the environment locale', () => {
    const iso = '2026-08-31T10:15:00.000Z'
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))

    expect(formatApiKeyDate(iso)).toBe(expected)
  })

  it('is not the raw ISO string', () => {
    const iso = '2026-08-31T10:15:00.000Z'

    expect(formatApiKeyDate(iso)).not.toBe(iso)
  })
})

describe('formatApiKeyDescription', () => {
  it('returns a placeholder for an empty description', () => {
    expect(formatApiKeyDescription('')).toBe('No description')
  })

  it('returns a non-empty description unchanged', () => {
    expect(formatApiKeyDescription('CI pipeline')).toBe('CI pipeline')
  })
})

describe('apiKeyStatus', () => {
  const now = new Date('2026-09-02T12:00:00.000Z')

  it('is active when the expiry is in the future', () => {
    expect(apiKeyStatus('2026-10-01T12:00:00.000Z', now)).toBe('active')
  })

  it('is expired when the expiry is in the past', () => {
    expect(apiKeyStatus('2026-08-01T12:00:00.000Z', now)).toBe('expired')
  })

  it('is expired exactly at the expiry moment', () => {
    expect(apiKeyStatus('2026-09-02T12:00:00.000Z', now)).toBe('expired')
  })

  it('uses the current time when no reference is given', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const past = new Date(Date.now() - 60_000).toISOString()

    expect(apiKeyStatus(future)).toBe('active')
    expect(apiKeyStatus(past)).toBe('expired')
  })
})
