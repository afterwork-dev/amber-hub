import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { AmberIconButton } from '../index'
import { Bell } from '../icons'

const warning = 'AmberIconButton requires a non-empty aria-label'

function warned(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.some((call) => String(call[0]).includes(warning))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AmberIconButton', () => {
  it('renders a labelled button with an aria-hidden icon', () => {
    const wrapper = mount(AmberIconButton, { props: { icon: Bell, ariaLabel: 'Notifications' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.classes()).toContain('amber-icon-button')
    expect(wrapper.attributes('aria-label')).toBe('Notifications')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('svg').attributes('width')).toBe('20')
  })

  it('renders the dot only when asked', () => {
    const plain = mount(AmberIconButton, { props: { icon: Bell, ariaLabel: 'Notifications' } })
    expect(plain.find('.amber-icon-button__dot').exists()).toBe(false)
    const flagged = mount(AmberIconButton, {
      props: { icon: Bell, ariaLabel: 'Notifications', dot: true },
    })
    expect(flagged.find('.amber-icon-button__dot').attributes('aria-hidden')).toBe('true')
  })

  it('emits click when enabled and nothing when disabled', async () => {
    const enabled = mount(AmberIconButton, { props: { icon: Bell, ariaLabel: 'Notifications' } })
    await enabled.trigger('click')
    expect(enabled.emitted('click')).toHaveLength(1)

    const disabled = mount(AmberIconButton, {
      props: { icon: Bell, ariaLabel: 'Notifications', disabled: true },
    })
    expect(disabled.attributes('disabled')).toBeDefined()
    await disabled.trigger('click')
    expect(disabled.emitted('click')).toBeUndefined()
  })

  it('warns for a missing label', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // @ts-expect-error ariaLabel is required
    mount({ render: () => h(AmberIconButton, { icon: Bell }) })
    expect(warned(spy)).toBe(true)
  })

  it.each(['', '   '])('warns for the label %j', (ariaLabel) => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(AmberIconButton, { props: { icon: Bell, ariaLabel } })
    expect(warned(spy)).toBe(true)
  })

  it('does not warn for a valid label', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(AmberIconButton, { props: { icon: Bell, ariaLabel: 'Notifications' } })
    expect(warned(spy)).toBe(false)
  })

  it('warns again when the label becomes empty', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mount(AmberIconButton, { props: { icon: Bell, ariaLabel: 'Notifications' } })
    expect(warned(spy)).toBe(false)
    await wrapper.setProps({ ariaLabel: ' ' })
    expect(warned(spy)).toBe(true)
  })
})
