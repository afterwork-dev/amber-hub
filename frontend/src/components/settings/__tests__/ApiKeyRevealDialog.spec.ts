import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard } from 'vuetify/components/VCard'
import { VDialog } from 'vuetify/components/VDialog'
import { VTextField } from 'vuetify/components/VTextField'
import ApiKeyRevealDialog from '../ApiKeyRevealDialog.vue'

const API_KEY = 'ahk_test-key-value'

const writeText = vi.fn()

// The dialog teleports its content out of the wrapper's DOM, so everything below queries the
// component tree rather than rendered HTML.
function mountDialog(props: Record<string, unknown> = {}) {
  return mount(ApiKeyRevealDialog, {
    props: { modelValue: true, apiKey: API_KEY, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
  })
}

function copyButton(wrapper: VueWrapper) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => ['Copy', 'Copied'].includes(candidate.props('text') as string))

  if (!found) throw new Error('no Copy button')
  return found
}

function doneButton(wrapper: VueWrapper) {
  const found = wrapper
    .findAllComponents(VBtn)
    .find((candidate) => candidate.props('text') === 'Done')

  if (!found) throw new Error('no Done button')
  return found
}

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('ApiKeyRevealDialog display', () => {
  it('shows the key in a read-only field', () => {
    const field = mountDialog().findComponent(VTextField)

    expect(field.props('modelValue')).toBe(API_KEY)
    expect(field.props('readonly')).toBe(true)
  })

  it('warns that the key cannot be shown again', () => {
    expect(mountDialog().findComponent(VCard).text()).toContain('cannot be shown again')
  })

  it('is persistent, so an outside click cannot discard the key', () => {
    expect(mountDialog().findComponent(VDialog).props('persistent')).toBe(true)
  })
})

describe('ApiKeyRevealDialog copy', () => {
  it('writes the exact key to the clipboard and confirms', async () => {
    const wrapper = mountDialog()

    await copyButton(wrapper).trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(API_KEY)
    expect(copyButton(wrapper).props('text')).toBe('Copied')
  })

  it('falls back to a manual-copy hint when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const wrapper = mountDialog()

    await copyButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.findComponent(VCard).text()).toContain('copy it manually')
    expect(wrapper.findComponent(VTextField).props('modelValue')).toBe(API_KEY)
  })

  it('resets the copy state when reopened for a new key', async () => {
    const wrapper = mountDialog()
    await copyButton(wrapper).trigger('click')
    await flushPromises()

    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })

    expect(copyButton(wrapper).props('text')).toBe('Copy')
  })
})

describe('ApiKeyRevealDialog dismissal', () => {
  it('emits update:modelValue false when Done is clicked', async () => {
    const wrapper = mountDialog()

    await doneButton(wrapper).trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('does not close on its own before Done is clicked', async () => {
    const wrapper = mountDialog()

    await copyButton(wrapper).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
