import { test, expect, type Page } from '@playwright/test'

// The mocked token isn't a real JWT, so the real backend would reject it and bounce the session
// back to login on any authenticated request. Mock every call the home page makes.
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
  // The settings page loads the caller's API keys on mount; keep it from reaching a real backend.
  await page.route('**/api/api-keys', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { apiKeys: [] }, error: null }),
    })
  })

  await page.goto('/login')
  const inputs = page.locator('input')
  await inputs.nth(0).fill('alice')
  await inputs.nth(1).fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')
}

test('the user menu offers Settings, which opens the settings page', async ({ page }) => {
  await login(page)

  await page.getByText('Hello, alice').click()
  await expect(page.getByText('Settings', { exact: true })).toBeVisible()

  await page.getByText('Settings', { exact: true }).click()

  await expect(page).toHaveURL('/settings')
})

test('the settings page shows a Settings title and a back control, and no user menu', async ({
  page,
}) => {
  await login(page)
  await page.goto('/settings')

  await expect(page.getByText('Settings', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Back')).toBeVisible()
  await expect(page.getByText('Hello, alice')).toHaveCount(0)
})

test('the back control returns to the home page, including after arriving directly', async ({
  page,
}) => {
  await login(page)
  await page.goto('/settings')

  await page.getByLabel('Back').click()

  await expect(page).toHaveURL('/')
  await expect(page.getByText('Hello, alice')).toBeVisible()
})

test('the settings drawer holds one selected "API Key" entry beside the API Keys section', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await login(page)
  await page.goto('/settings')

  const entries = page.locator('.v-navigation-drawer .v-list-item')
  await expect(entries).toHaveCount(1)
  await expect(entries.first()).toHaveText('API Key')
  await expect(entries.first()).toHaveClass(/v-list-item--active/)
  await expect(page.locator('.v-main')).toContainText('API Keys')

  await entries.first().click()

  await expect(page).toHaveURL('/settings')
  await expect(entries.first()).toHaveClass(/v-list-item--active/)
  await expect(page.locator('.v-main')).toContainText('API Keys')
  expect(consoleErrors).toEqual([])
})
