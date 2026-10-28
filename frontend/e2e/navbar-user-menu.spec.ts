import { test, expect } from '@playwright/test'

async function login(page: import('@playwright/test').Page) {
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
  // The home page fetches the installed-apps list on every load (this test re-navigates to /
  // mid-test); since the mocked token isn't a real JWT, the real backend would reject it and
  // trigger a renewal attempt against the (also fake) refresh token, redirecting to login. Mock
  // it out.
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

test('the user menu offers Logout, which clears the session and redirects to login', async ({
  page,
}) => {
  await login(page)

  await expect(page.getByText('Hello, alice')).toBeVisible()

  await page.getByText('Hello, alice').click()
  await expect(page.getByText('Logout', { exact: true })).toBeVisible()

  await page.getByText('Logout', { exact: true }).click()

  await expect(page).toHaveURL('/login')
  const token = await page.evaluate(() => window.localStorage.getItem('auth.token'))
  const username = await page.evaluate(() => window.localStorage.getItem('auth.username'))
  expect(token).toBeNull()
  expect(username).toBeNull()

  await page.goto('/')
  await expect(page).toHaveURL('/login')
})
