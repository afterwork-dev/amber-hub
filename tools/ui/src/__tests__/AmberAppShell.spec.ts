import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { AmberAppShell, AmberNavDrawer, AmberNavItem, AmberNavSection, AmberTopBar } from '../index'

let callback: ResizeObserverCallback | undefined
let disconnected = 0

class FakeResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    callback = cb
  }
  observe() {}
  unobserve() {}
  disconnect() {
    disconnected++
  }
}

async function resize(width: number) {
  callback?.(
    [{ borderBoxSize: [{ inlineSize: width }] }] as unknown as ResizeObserverEntry[],
    {} as ResizeObserver,
  )
  await nextTick()
}

function mountShell() {
  return mount(AmberAppShell, {
    attachTo: document.body,
    slots: {
      'top-bar': () => h(AmberTopBar, { appName: 'Treasury' }),
      drawer: () =>
        h(AmberNavDrawer, { appName: 'Treasury' }, () =>
          h(AmberNavSection, { label: 'Main' }, () => h(AmberNavItem, { href: '#' }, () => 'Home')),
        ),
      default: () => h('p', 'Content'),
    },
  })
}

let wrapper: VueWrapper | undefined

beforeEach(() => {
  callback = undefined
  disconnected = 0
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

describe('AmberAppShell size classes', () => {
  it('follows the width reported for the shell', async () => {
    wrapper = mountShell()
    const shell = wrapper.get('.amber-app-shell')
    await resize(390)
    expect(shell.classes()).toEqual(
      expect.arrayContaining(['amber-app-shell--phone', 'amber-app-shell--narrow']),
    )
    await resize(800)
    expect(shell.classes()).toContain('amber-app-shell--tablet')
    expect(shell.classes()).toContain('amber-app-shell--narrow')
    expect(shell.classes()).not.toContain('amber-app-shell--phone')
    await resize(1100)
    expect(shell.classes()).toContain('amber-app-shell--tablet')
    expect(shell.classes()).not.toContain('amber-app-shell--narrow')
    await resize(1440)
    expect(shell.classes()).toContain('amber-app-shell--desktop')
    expect(shell.classes()).not.toContain('amber-app-shell--narrow')
  })

  it('disconnects the observer on unmount', () => {
    wrapper = mountShell()
    wrapper.unmount()
    wrapper = undefined
    expect(disconnected).toBe(1)
  })
})

describe('AmberAppShell narrow', () => {
  it('opens the overlay from the menu button, and Escape closes it and returns focus', async () => {
    wrapper = mountShell()
    await resize(800)
    expect(wrapper.find('.amber-app-shell__body .amber-nav-drawer').exists()).toBe(false)
    const button = wrapper.get('button[aria-label="Open navigation"]')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(false)

    await button.trigger('click')
    await nextTick()
    const overlay = wrapper.get('.amber-app-shell__overlay')
    const drawer = overlay.get('.amber-nav-drawer')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(button.attributes('aria-controls')).toBe(drawer.attributes('id'))
    expect(document.activeElement).toBe(overlay.get('a').element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    await nextTick()
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(false)
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button.element)
  })

  it('closes on a scrim click after reopening', async () => {
    wrapper = mountShell()
    await resize(800)
    const button = wrapper.get('button[aria-label="Open navigation"]')
    await button.trigger('click')
    await wrapper.get('.amber-app-shell__scrim').trigger('click')
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(false)
    await nextTick()
    expect(document.activeElement).toBe(button.element)
    await button.trigger('click')
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(true)
    await wrapper.get('.amber-app-shell__scrim').trigger('click')
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(false)
  })

  it('ignores Escape while the overlay is closed', async () => {
    wrapper = mountShell()
    await resize(800)
    const button = wrapper.get('button[aria-label="Open navigation"]')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(document.activeElement).not.toBe(button.element)
  })

  it('closes the overlay when the shell becomes wide', async () => {
    wrapper = mountShell()
    await resize(800)
    await wrapper.get('button[aria-label="Open navigation"]').trigger('click')
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(true)
    await resize(1440)
    expect(wrapper.find('.amber-app-shell__overlay').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Open navigation"]').exists()).toBe(false)
    expect(wrapper.find('.amber-app-shell__body .amber-nav-drawer').exists()).toBe(true)
  })
})

describe('AmberAppShell wide', () => {
  it('has no menu button and renders the drawer inline', async () => {
    wrapper = mountShell()
    await resize(1440)
    expect(wrapper.classes()).toContain('amber-app-shell--desktop')
    expect(wrapper.classes()).not.toContain('amber-app-shell--narrow')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('.amber-app-shell__body .amber-nav-drawer').exists()).toBe(true)
    expect(wrapper.get('main.amber-app-shell__content').text()).toBe('Content')
  })
})
