import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { AmberRadio, AmberRadioGroup } from '../index'

const Wrapper = defineComponent({
  props: {
    initial: { type: [String, Number], default: undefined },
    label: { type: String, default: undefined },
    ariaLabel: { type: String, default: undefined },
    disabled: Boolean,
    disabledValue: { type: [String, Number], default: undefined },
    values: { type: Array as () => (string | number)[], default: () => ['a', 'b', 'c'] },
  },
  setup(props) {
    const value = ref(props.initial)
    return () =>
      h(
        AmberRadioGroup,
        {
          modelValue: value.value,
          'onUpdate:modelValue': (next: string | number) => (value.value = next),
          label: props.label,
          ariaLabel: props.ariaLabel,
          disabled: props.disabled,
        },
        () =>
          props.values.map((item) =>
            h(AmberRadio, {
              value: item,
              label: String(item),
              disabled: item === props.disabledValue,
            }),
          ),
      )
  },
})

function mountGroup(props: Record<string, unknown> = {}) {
  return mount(Wrapper, { props: { label: 'Pick', ...props }, attachTo: document.body })
}

const inputs = (wrapper: ReturnType<typeof mountGroup>) =>
  wrapper.findAll<HTMLInputElement>('input').map((input) => input.element)

function press(input: HTMLInputElement, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  input.dispatchEvent(event)
  return event
}

describe('AmberRadioGroup', () => {
  it('is a radiogroup labelled by its visible label', () => {
    const wrapper = mountGroup({ label: 'Colour' })
    const group = wrapper.find('[role="radiogroup"]')
    const labelId = group.attributes('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId as string)?.textContent).toBe('Colour')
    wrapper.unmount()
  })

  it('uses ariaLabel when there is no label', () => {
    const wrapper = mountGroup({ label: undefined, ariaLabel: 'Colour' })
    const group = wrapper.find('[role="radiogroup"]')
    expect(group.attributes('aria-label')).toBe('Colour')
    expect(group.attributes('aria-labelledby')).toBeUndefined()
    wrapper.unmount()
  })

  it('shares one name per group and differs between groups', () => {
    const one = mountGroup()
    const two = mountGroup()
    const names = new Set(inputs(one).map((input) => input.name))
    expect(names.size).toBe(1)
    expect([...names][0]).toBeTruthy()
    expect(inputs(two)[0]?.name).not.toBe(inputs(one)[0]?.name)
    one.unmount()
    two.unmount()
  })

  it('checks the radio matching modelValue and follows changes', async () => {
    const wrapper = mountGroup({ initial: 'b' })
    expect(inputs(wrapper).map((input) => input.checked)).toEqual([false, true, false])
    await wrapper.findAll('input')[2]?.setValue(true)
    expect(inputs(wrapper).map((input) => input.checked)).toEqual([false, false, true])
    wrapper.unmount()
  })

  it('emits values with their type', async () => {
    const wrapper = mount(AmberRadioGroup, {
      props: { label: 'Pick' },
      slots: {
        default: () => [
          h(AmberRadio, { value: 1, label: 'One' }),
          h(AmberRadio, { value: 2, label: 'Two' }),
        ],
      },
    })
    await wrapper.findAll('input')[1]?.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  })

  it('moves selection and focus with the arrow keys, wrapping at both ends', async () => {
    const wrapper = mountGroup({ initial: 'a' })
    const [a, b, c] = inputs(wrapper) as [HTMLInputElement, HTMLInputElement, HTMLInputElement]
    a.focus()
    expect(press(a, 'ArrowDown').defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(b.checked).toBe(true)
    expect(document.activeElement).toBe(b)
    press(b, 'ArrowRight')
    await wrapper.vm.$nextTick()
    expect(c.checked).toBe(true)
    press(c, 'ArrowDown')
    await wrapper.vm.$nextTick()
    expect(a.checked).toBe(true)
    press(a, 'ArrowUp')
    await wrapper.vm.$nextTick()
    expect(c.checked).toBe(true)
    expect(document.activeElement).toBe(c)
    press(c, 'ArrowLeft')
    await wrapper.vm.$nextTick()
    expect(b.checked).toBe(true)
    wrapper.unmount()
  })

  it('skips disabled radios', async () => {
    const wrapper = mountGroup({ initial: 'a', disabledValue: 'b' })
    const [a, , c] = inputs(wrapper) as [HTMLInputElement, HTMLInputElement, HTMLInputElement]
    press(a, 'ArrowDown')
    await wrapper.vm.$nextTick()
    expect(c.checked).toBe(true)
    wrapper.unmount()
  })

  it('leaves other keys alone', async () => {
    const wrapper = mountGroup({ initial: 'a' })
    const [a] = inputs(wrapper) as [HTMLInputElement]
    expect(press(a, 'a').defaultPrevented).toBe(false)
    await wrapper.vm.$nextTick()
    expect(a.checked).toBe(true)
    wrapper.unmount()
  })

  it('disables every radio when the group is disabled', () => {
    const wrapper = mountGroup({ disabled: true })
    expect(inputs(wrapper).every((input) => input.disabled)).toBe(true)
    expect(wrapper.findAll('.amber-choice--disabled')).toHaveLength(3)
    wrapper.unmount()
  })
})
