import { defineComponent, h } from 'vue'

/** Chart.js needs a real canvas context, which jsdom lacks. */
export const ChartStub = defineComponent({
  props: {
    data: { type: Object, required: true },
    options: { type: Object, required: true },
    ariaLabel: { type: String, default: '' },
  },
  setup: (props) => () => h('canvas', { 'aria-label': props.ariaLabel }),
})

export const chartModule = { Bar: ChartStub }
