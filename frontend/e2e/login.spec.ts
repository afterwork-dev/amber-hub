import { test, expect } from '@playwright/test'

test('a registered user can log in from the login page and lands on home', async ({ page }) => {
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

  await expect(page.getByText('Invalid username or password')).not.toBeVisible()
  await expect(page).toHaveURL('/')
})

test('a failed login keeps the visitor on the login page with no redirect', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { errorCode: 'INVALID_CREDENTIALS', errorMessage: 'Invalid username or password' },
      }),
    })
  })

  await page.goto('/login')

  const inputs = page.locator('input')
  await inputs.nth(0).fill('alice')
  await inputs.nth(1).fill('wrong-password')

  await page.getByRole('button', { name: 'Login' }).click()

  await expect(page.getByText('Invalid username or password')).toBeVisible()
  await expect(page).toHaveURL('/login')
})
