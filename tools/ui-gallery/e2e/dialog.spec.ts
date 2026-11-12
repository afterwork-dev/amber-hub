import { test, expect } from '@playwright/test'

test('Escape closes the basic dialog and returns focus to its trigger', async ({ page }) => {
  await page.goto('/components/dialog')
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Rename budget' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
