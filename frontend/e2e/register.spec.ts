import { test, expect } from '@playwright/test'

test('a visitor who registers is signed in immediately and lands on the home page', async ({
  page,
}) => {
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      status: 201,
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
  // The home page fetches the installed-apps list on every load (including the reload below);
  // since the mocked token isn't a real JWT, the real backend would reject it and trigger a
  // renewal attempt against the (also fake) refresh token, redirecting to login. Mock it out.
  await page.route('**/api/apps', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { apps: [] } }),
    })
  })

  await page.goto('/register')

  const inputs = page.locator('input')
  await inputs.nth(0).fill('alice')
  await inputs.nth(1).fill('correct-horse-battery')
  await inputs.nth(2).fill('correct-horse-battery')

  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page).toHaveURL('/')
  expect(await page.evaluate(() => window.localStorage.getItem('auth.token'))).toContain(
    'jwt-token',
  )

  await page.reload()
  await expect(page).toHaveURL('/')
})
