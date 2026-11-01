import { test, expect } from '@playwright/test'

test('/ redirects to the Colour page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL('/foundations/colour')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Colour')
})

test('each preset sets the frame width and the viewport query', async ({ page }) => {
  await page.goto('/foundations/radius')
  const frame = page.getByTestId('frame')
  const windowSize = page.viewportSize()

  for (const [label, query, width] of [
    ['Phone 390', 'phone', 390],
    ['Tablet 834', 'tablet', 834],
    ['Desktop 1440', 'desktop', 1440],
  ] as const) {
    const button = page.getByRole('button', { name: label })
    await button.click()
    await expect(page).toHaveURL(`/foundations/radius?viewport=${query}`)
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(await frame.evaluate((el) => el.getBoundingClientRect().width)).toBe(width)
  }

  await page.getByRole('button', { name: 'Full' }).click()
  await expect(page).toHaveURL('/foundations/radius')
  await expect(page.getByRole('button', { name: 'Full' })).toHaveAttribute('aria-pressed', 'true')
  const [frameWidth, contentWidth] = await frame.evaluate((el) => [
    el.getBoundingClientRect().width,
    el.parentElement!.clientWidth,
  ])
  expect(frameWidth).toBe(contentWidth)
  expect(page.viewportSize()).toEqual(windowSize)
})

test('the viewport query survives nav clicks', async ({ page }) => {
  await page.goto('/foundations/spacing?viewport=phone')
  await expect(page.getByRole('button', { name: 'Phone 390' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('link', { name: 'Radius' }).click()
  await expect(page).toHaveURL('/foundations/radius?viewport=phone')
  await expect(page.getByRole('link', { name: 'Radius' })).toHaveAttribute('aria-current', 'page')
})

test('the grid overlay margin follows the preset', async ({ page }) => {
  for (const [query, margin] of [
    ['phone', '16px'],
    ['tablet', '32px'],
    ['desktop', '80px'],
  ] as const) {
    await page.goto(`/foundations/spacing?viewport=${query}`)
    await expect(page.getByTestId('grid-label')).toHaveText(
      `12 columns · 24px gutter · ${margin} margins`,
    )
  }
})

test.describe('motion with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('the demo transition duration is 0s', async ({ page }) => {
    await page.goto('/foundations/motion')
    const block = page.getByTestId('demo-duration-fast')
    expect(await block.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  })
})

test('the motion demo has a non-zero transition duration by default', async ({ page }) => {
  await page.goto('/foundations/motion')
  const block = page.getByTestId('demo-duration-fast')
  expect(await block.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s')
})
