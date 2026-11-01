import { test, expect } from '@playwright/test'
import { pages } from '../src/pages'

const localHosts = new Set(['localhost', '127.0.0.1'])

for (const page of pages) {
  test(`${page.group} / ${page.title} loads without errors or outside requests`, async ({
    page: tab,
  }) => {
    const problems: string[] = []
    tab.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console error: ${message.text()}`)
    })
    tab.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
    tab.on('requestfailed', (request) =>
      problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`),
    )
    tab.on('response', (response) => {
      if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`)
    })
    tab.on('request', (request) => {
      const url = new URL(request.url())
      if (url.protocol !== 'data:' && !localHosts.has(url.hostname)) {
        problems.push(`request outside localhost: ${request.url()}`)
      }
    })

    await tab.goto(page.path)
    await expect(tab.getByRole('heading', { level: 1 })).toHaveText(page.title)
    await tab.waitForLoadState('networkidle')

    expect(problems).toEqual([])
  })
}
