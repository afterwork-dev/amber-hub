import { test, expect } from '@playwright/test'

test('direct navigation to home with no session redirects to login', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL('/login')
})

test('an authenticated visitor can reach home, and losing the session redirects back to login', async ({
  page,
}) => {
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

  await page.goto('/login')
  const inputs = page.locator('input')
  await inputs.nth(0).fill('alice')
  await inputs.nth(1).fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL('/')

  await page.evaluate(() => window.localStorage.removeItem('auth.token'))
  await page.goto('/')

  await expect(page).toHaveURL('/login')
})
