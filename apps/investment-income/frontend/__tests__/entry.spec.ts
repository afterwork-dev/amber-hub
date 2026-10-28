import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, unmount } from '../entry'

let container: HTMLDivElement
let root: ShadowRoot

function headStyleCount(): number {
  return document.head.querySelectorAll('style').length
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = container.attachShadow({ mode: 'open' })
})

afterEach(() => {
  container.remove()
})

describe('Investment Income frontend entry', () => {
  it('renders the shell into the ShadowRoot it is given', () => {
    mount(root, { appId: 'investment-income' })

    const headings = root.querySelectorAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0]?.textContent).toBe('Investment Income')
    expect(root.querySelectorAll('.v-main')).toHaveLength(1)
  })

  it('injects exactly one stylesheet, inside the shadow root', () => {
    mount(root, { appId: 'investment-income' })

    const styles = root.querySelectorAll('style')
    expect(styles).toHaveLength(1)
    expect(styles[0]?.textContent).not.toBe('')
  })

  it('never writes a stylesheet into the document head (isolation guarantee)', () => {
    const before = headStyleCount()

    mount(root, { appId: 'investment-income' })
    expect(headStyleCount()).toBe(before)

    unmount(root)
    expect(headStyleCount()).toBe(before)
  })

  it('leaves the shadow root empty after unmount', () => {
    mount(root, { appId: 'investment-income' })
    unmount(root)

    expect(root.childNodes).toHaveLength(0)
  })

  it('does not duplicate anything across repeated visits', () => {
    for (let visit = 0; visit < 10; visit += 1) {
      mount(root, { appId: 'investment-income' })
      unmount(root)
    }
    mount(root, { appId: 'investment-income' })

    expect(root.querySelectorAll('style')).toHaveLength(1)
    expect(root.querySelectorAll('h1')).toHaveLength(1)
    expect(root.querySelectorAll('.v-main')).toHaveLength(1)
  })

  // The Hub loads @mdi/font into the document, whose class rules cannot cross the shadow
  // boundary, so a class-based icon renders as an empty box in here. The mount switches Vuetify to
  // the mdi-svg aliases, which emit inline SVG instead.
  it('renders Vuetify icons as inline SVG rather than mdi-* classes', async () => {
    const fetchSpy = globalThis.fetch
    globalThis.fetch = (() => Promise.reject(new Error('backend down'))) as typeof fetch

    mount(root, { appId: 'investment-income' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    const icons = root.querySelectorAll('.v-icon')
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(icon.querySelector('svg path')).not.toBeNull()
      expect(icon.className).not.toMatch(/\bmdi-/)
    }

    globalThis.fetch = fetchSpy
  })

  // Feature 014 asserted no network call at all; feature 017 gives the app a list that loads on
  // mount. What still has to hold is that an unreachable backend costs the user the entries, not
  // the app: the shell renders in full either way.
  it('renders the shell in full even when the backend is unreachable', async () => {
    const fetchSpy = globalThis.fetch
    globalThis.fetch = (() => Promise.reject(new Error('backend down'))) as typeof fetch

    mount(root, { appId: 'investment-income' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    const headings = root.querySelectorAll('h1')
    expect(headings).toHaveLength(1)
    expect(headings[0]?.textContent).toBe('Investment Income')
    expect(root.querySelectorAll('.v-main')).toHaveLength(1)
    expect(root.textContent).toMatch(/could not be loaded/i)

    globalThis.fetch = fetchSpy
  })
})
