import { defineComponent, h } from 'vue'

export const ChartStub = defineComponent({
  props: {
    data: { type: Object, required: true },
    options: { type: Object, required: true },
    ariaLabel: { type: String, default: '' },
  },
  setup: (props) => () => h('canvas', { 'aria-label': props.ariaLabel }),
})

export const chartModule = { Bar: ChartStub, Doughnut: ChartStub, Line: ChartStub }
