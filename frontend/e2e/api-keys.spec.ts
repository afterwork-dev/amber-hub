import { test, expect, type Page } from '@playwright/test'

const API_KEY = 'ahk_e2eFixtureKey_0123456789abcdefghijklmnopq'

interface KeyRow {
  id: string
  description: string
  createdAt: string
  expiresAt: string
}

// The mocked token isn't a real JWT, so the real backend would reject it and bounce the session
// back to login on any authenticated request. Mock every call the pages make.
async function login(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          username: 'alice',
          token: 'jwt-token',
          expiresIn: '15m',
          refreshToken: 'refresh-token',
          refreshExpiresIn: '7d',
        },
      }),
    })
  })
  await page.route('**/api/apps', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { apps: [] } }),
    })
  })

  await page.goto('/login')
  const inputs = page.locator('input')
  await inputs.nth(0).fill('alice')
  await inputs.nth(1).fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

// A stateful, method-aware mock of the api-keys resource: GET lists the current keys, POST creates
// and prepends one (revealing the plaintext once), DELETE removes by id. The returned state array
// lets a test assert what the server holds.
function mockApiKeyApi(
  page: Page,
  opts: { initial?: KeyRow[]; createRequests?: unknown[] } = {},
): { keys: KeyRow[] } {
  const state: { keys: KeyRow[] } = { keys: [...(opts.initial ?? [])] }

  page.route('**/api/api-keys', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { apiKeys: state.keys }, error: null }),
      })
      return
    }

    const payload = route.request().postDataJSON() as { description?: string }
    opts.createRequests?.push(payload)
    const created: KeyRow = {
      id: `key-${state.keys.length + 1}`,
      description: payload.description ?? '',
      createdAt: '2026-08-31T10:00:00.000Z',
      expiresAt: '2026-10-30T10:00:00.000Z',
    }
    state.keys.unshift(created)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { ...created, key: API_KEY }, error: null }),
    })
  })

  page.route('**/api/api-keys/*', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback()
      return
    }
    const id = route.request().url().split('/').pop() ?? ''
    state.keys = state.keys.filter((key) => key.id !== id)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id }, error: null }),
    })
  })

  return state
}

test('a key is created, revealed once, copied, and gone after a reload', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const requests: unknown[] = []
  await login(page)
  mockApiKeyApi(page, { createRequests: requests })
  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New' }).click()
  await page.locator('.v-select').click()
  await page.getByRole('option', { name: '60 days' }).click()
  await page.getByRole('button', { name: 'Create' }).click()

  expect(requests).toEqual([{ validityDays: 60 }])
  const keyField = page.getByLabel('API key', { exact: true })
  await expect(keyField).toHaveValue(/^ahk_/)
  await expect(keyField).toHaveValue(API_KEY)

  await page.getByRole('button', { name: 'Copy API key' }).click()
  await expect(page.getByRole('button', { name: 'Copy API key' })).toContainText('Copied')
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe(API_KEY)

  await page.getByRole('button', { name: 'Done' }).click()
  await expect(keyField).toHaveCount(0)
  expect(await page.content()).not.toContain(API_KEY)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'API Keys', exact: true })).toBeVisible()
  expect(await page.content()).not.toContain(API_KEY)
})

test('an outside click does not dismiss the reveal dialog', async ({ page }) => {
  const requests: unknown[] = []
  await login(page)
  mockApiKeyApi(page, { createRequests: requests })
  await page.goto('/settings')

  await page.getByRole('button', { name: 'New' }).click()
  await page.getByRole('button', { name: 'Create' }).click()
  const keyField = page.getByLabel('API key', { exact: true })
  await expect(keyField).toHaveValue(API_KEY)

  await page.mouse.click(5, 5)

  await expect(keyField).toHaveValue(API_KEY)
})

test('the list shows status, deletes behind a confirm dialog, and returns to empty', async ({
  page,
}) => {
  const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  await login(page)
  mockApiKeyApi(page, {
    initial: [
      { id: 'live', description: 'CI pipeline', createdAt: '2026-08-01T10:00:00.000Z', expiresAt: futureIso },
      { id: 'stale', description: '', createdAt: '2026-06-01T10:00:00.000Z', expiresAt: pastIso },
    ],
  })
  await page.goto('/settings')

  await expect(page.getByText('CI pipeline')).toBeVisible()
  await expect(page.getByText('No description')).toBeVisible()
  await expect(page.getByText('Active')).toBeVisible()
  await expect(page.getByText('Expired')).toBeVisible()

  // Delete the expired key behind the confirmation dialog.
  await page.getByRole('button', { name: 'Delete key No description' }).click()
  await expect(page.getByText(/cannot be undone/i)).toBeVisible()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByText('No description')).toHaveCount(0)
  await expect(page.getByText('API key deleted')).toBeVisible()
  await expect(page.getByText('CI pipeline')).toBeVisible()

  // Delete the last remaining key; the empty state returns.
  await page.getByRole('button', { name: 'Delete key CI pipeline' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByText('No API keys yet')).toBeVisible()
})

test('a cancelled confirmation leaves the key in place', async ({ page }) => {
  const futureIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await login(page)
  mockApiKeyApi(page, {
    initial: [
      { id: 'live', description: 'Keep me', createdAt: '2026-08-01T10:00:00.000Z', expiresAt: futureIso },
    ],
  })
  await page.goto('/settings')

  await page.getByRole('button', { name: 'Delete key Keep me' }).click()
  await expect(page.getByText(/cannot be undone/i)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('cell', { name: 'Keep me', exact: true })).toBeVisible()
})
