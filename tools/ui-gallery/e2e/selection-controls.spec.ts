import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/components/selection')
})

test('Space flips a focused switch', async ({ page }) => {
  const control = page.getByRole('switch', { name: 'Off', exact: true })
  await control.focus()
  await expect(control).toHaveAttribute('aria-checked', 'false')
  await page.keyboard.press(' ')
  await expect(control).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press(' ')
  await expect(control).toHaveAttribute('aria-checked', 'false')
})

test('Space toggles a focused checkbox', async ({ page }) => {
  const control = page.getByRole('checkbox', { name: 'Unchecked', exact: true })
  await control.focus()
  await page.keyboard.press(' ')
  await expect(control).toBeChecked()
  await page.keyboard.press(' ')
  await expect(control).not.toBeChecked()
})

test('clicking label text toggles a checkbox', async ({ page }) => {
  const control = page.getByRole('checkbox', { name: 'Unchecked', exact: true })
  await page.getByText('Unchecked', { exact: true }).click()
  await expect(control).toBeChecked()
})

test('arrow keys move the Colour group selection and wrap', async ({ page }) => {
  const group = page.getByRole('radiogroup', { name: 'Colour' })
  const amber = group.getByRole('radio', { name: 'Amber' })
  const slate = group.getByRole('radio', { name: 'Slate' })
  await expect(amber).toBeChecked()
  await slate.focus()
  await page.keyboard.press('ArrowDown')
  await expect(amber).toBeChecked()
  await expect(amber).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await expect(slate).toBeChecked()
})

test('every control row is at least 44px tall', async ({ page }) => {
  const rows = page.locator('label.amber-choice')
  await expect(rows.first()).toBeVisible()
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  for (let index = 0; index < count; index++) {
    const box = await rows.nth(index).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
})

test('a disabled switch does not change when clicked', async ({ page }) => {
  const control = page.getByRole('switch', { name: 'Disabled off' })
  await page.getByText('Disabled off', { exact: true }).click({ force: true })
  await expect(control).toHaveAttribute('aria-checked', 'false')
})
