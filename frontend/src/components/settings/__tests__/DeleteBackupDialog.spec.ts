import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import DeleteBackupDialog from '../DeleteBackupDialog.vue'
import { formatApiKeyDate } from '../../../utils/formatApiKey'

const backup = {
  id: 'r1',
  status: 'ready' as const,
  createdAt: '2026-11-11T10:00:00.000Z',
  completedAt: '2026-11-11T10:01:00.000Z',
  createdByUsername: 'alice',
  sizeBytes: 2048,
  errorMessage: null,
}

function mountDialog(props: Record<string, unknown> = {}) {
  return mount(DeleteBackupDialog, {
    props: { modelValue: true, backup, ...props },
    global: { plugins: [createVuetify({ theme: false })] },
    attachTo: document.body,
  })
}

function button(text: string) {
  return (wrapper: ReturnType<typeof mountDialog>) =>
    wrapper.findAllComponents(VBtn).find((b) => b.props('text') === text)!
}

describe('DeleteBackupDialog', () => {
  it('names the backup by its creation date', () => {
    const wrapper = mountDialog()

    expect(document.body.textContent).toContain(formatApiKeyDate(backup.createdAt))
    wrapper.unmount()
  })

  it('emits confirm on Delete and closes on Cancel', async () => {
    const wrapper = mountDialog()

    await button('Delete')(wrapper).trigger('click')
    await button('Cancel')(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('shows an error and a busy Delete button while deleting', () => {
    const wrapper = mountDialog({ deleting: true, error: 'The backup could not be deleted.' })

    expect(document.body.textContent).toContain('The backup could not be deleted.')
    expect(button('Delete')(wrapper).props('loading')).toBe(true)
    wrapper.unmount()
  })
})
