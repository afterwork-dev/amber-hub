import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VAlert } from 'vuetify/components/VAlert'
import { VBtn } from 'vuetify/components/VBtn'
import { VDialog } from 'vuetify/components/VDialog'
import ConfirmDialog from '../ConfirmDialog.vue'

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ConfirmDialog, {
    props: {
      modelValue: true,
      title: 'Delete transaction?',
      message: 'The payout of 4,50 € on 20.02.2026 will be deleted. This cannot be undone.',
      confirmText: 'Delete',
      ...props,
    },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function button(wrapper: VueWrapper, text: string) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === text)

  if (!found) throw new Error(`no button labelled "${text}"`)
  return found
}

// The dialog's card is an overlay, which Vuetify teleports out of the component's own subtree.
function overlayText(): string {
  return document.body.textContent ?? ''
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('ConfirmDialog', () => {
  it('asks the question it was given', () => {
    mountDialog()

    expect(document.querySelector('.v-card-title')?.textContent?.trim()).toBe('Delete transaction?')
    expect(overlayText()).toContain('The payout of 4,50 € on 20.02.2026 will be deleted.')
  })

  it('warns that the deletion cannot be undone', () => {
    mountDialog()

    expect(overlayText()).toContain('cannot be undone')
  })

  it('names the destructive action rather than saying “OK”', () => {
    expect(button(mountDialog(), 'Delete').exists()).toBe(true)
  })

  it('marks the confirming action as destructive (Constitution III)', () => {
    expect(button(mountDialog(), 'Delete').props('color')).toBe('error')
  })

  it('offers a way out beside the destructive action', () => {
    expect(button(mountDialog(), 'Cancel').exists()).toBe(true)
  })

  it('ties its title to the dialog for assistive technology', () => {
    mountDialog()

    const labelId = document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')

    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId as string)?.textContent?.trim()).toBe(
      'Delete transaction?',
    )
  })

  it('stays shut until it is opened', () => {
    expect(mountDialog({ modelValue: false }).findComponent(VDialog).props('modelValue')).toBe(
      false,
    )
  })

  it('deletes nothing of its own accord: only the confirm button confirms', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('closes on cancel', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('asks the caller to delete, rather than deleting itself', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Delete').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('does not close itself on confirm: the caller decides once the work is done', async () => {
    const wrapper = mountDialog()

    await button(wrapper, 'Delete').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('cannot be confirmed twice while the deletion is in flight', () => {
    const wrapper = mountDialog({ busy: true })

    expect(button(wrapper, 'Delete').props('disabled')).toBe(true)
    expect(button(wrapper, 'Delete').props('loading')).toBe(true)
  })

  it('cannot be cancelled mid-flight, when cancelling would change nothing', () => {
    expect(button(mountDialog({ busy: true }), 'Cancel').props('disabled')).toBe(true)
  })

  it('says nothing about an error until there is one', () => {
    expect(mountDialog().findComponent(VAlert).exists()).toBe(false)
  })

  it('shows a failed deletion in the dialog, leaving the action to retry', () => {
    const wrapper = mountDialog({ error: 'The transaction could not be deleted.' })
    const alert = wrapper.findComponent(VAlert)

    expect(alert.text()).toContain('could not be deleted')
    expect(alert.attributes('role')).toBe('alert')
    expect(button(wrapper, 'Delete').props('disabled')).toBe(false)
  })

  it('takes over the screen on a phone, where a centred card would be cramped', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })

    expect(mountDialog().findComponent(VDialog).props('fullscreen')).toBe(true)
  })

  it('stays a centred card on a desktop', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })

    expect(mountDialog().findComponent(VDialog).props('fullscreen')).toBe(false)
  })
})
