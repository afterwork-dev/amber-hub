import { test, expect } from '@playwright/test'

const layouts = ['app-shell', 'dashboard', 'form']
const presets = [
  { id: 'phone', menu: true },
  { id: 'tablet', menu: true },
  { id: 'desktop', menu: false },
] as const

for (const layout of layouts) {
  for (const preset of presets) {
    test(`/layouts/${layout} at ${preset.id} has no overflow and the right navigation`, async ({
      page,
    }) => {
      await page.goto(`/layouts/${layout}?viewport=${preset.id}`)
      const shell = page.locator('.amber-app-shell')
      await expect(shell).toHaveClass(new RegExp(`amber-app-shell--${preset.id}`))

      const frame = page.getByTestId('frame')
      const overflow = await frame.evaluate((el) => el.scrollWidth - el.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)

      const menu = page.getByRole('button', { name: 'Open navigation' })
      const drawer = page.getByRole('navigation', { name: 'Main' })
      if (preset.menu) {
        await expect(menu).toBeVisible()
        await expect(drawer).toHaveCount(0)
      } else {
        await expect(menu).toHaveCount(0)
        await expect(drawer).toBeVisible()
      }
    })
  }
}

test('the phone drawer opens over a scrim, closes with Escape and links keep the viewport', async ({
  page,
}) => {
  await page.goto('/layouts/app-shell?viewport=phone')
  const menu = page.getByRole('button', { name: 'Open navigation' })
  await menu.click()
  const drawer = page.getByRole('navigation', { name: 'Main' })
  await expect(drawer).toBeVisible()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.amber-app-shell__scrim')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(menu).toBeFocused()

  await menu.click()
  await drawer.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL('/layouts/dashboard?viewport=phone')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Dashboard' }),
  ).toHaveAttribute('aria-current', 'page')
})
