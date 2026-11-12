<script lang="ts">
// useId() only counts within one Vue app, so a module counter keeps the title id unique across
// apps on the same page (as in useField.ts).
let dialogCount = 0
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

export interface AmberDialogProps {
  modelValue?: boolean
  title?: string
  persistent?: boolean
}

const props = withDefaults(defineProps<AmberDialogProps>(), {
  modelValue: false,
  title: undefined,
  persistent: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const titleId = `${useId()}-${dialogCount++}`

const dialog = ref<HTMLDialogElement>()
let returnFocus: HTMLElement | undefined
let pointerDownOnScrim = false

// The focused element, looking through open shadow roots so a trigger inside an app's shadow
// root is found.
function focusedElement(): HTMLElement | undefined {
  let element = document.activeElement
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement
  return element instanceof HTMLElement ? element : undefined
}

function open() {
  const element = dialog.value
  if (!element || element.open) return
  returnFocus = focusedElement()
  element.showModal()
}

function close() {
  const element = dialog.value
  if (!element) return
  element.close()
  if (returnFocus?.isConnected) returnFocus.focus()
  returnFocus = undefined
}

function requestClose() {
  if (!props.persistent) emit('update:modelValue', false)
}

function onCancel(event: Event) {
  event.preventDefault()
  requestClose()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  requestClose()
}

function onPointerdown(event: PointerEvent) {
  pointerDownOnScrim = event.target === dialog.value
}

function onClick(event: MouseEvent) {
  const onScrim = pointerDownOnScrim && event.target === dialog.value
  pointerDownOnScrim = false
  if (onScrim) requestClose()
}

// A native close, e.g. from a <form method="dialog"> inside, while the parent still says open.
function onClose() {
  // The event is queued, so it can arrive after the dialog was opened again; ignore it then.
  if (props.modelValue && !dialog.value?.open) emit('update:modelValue', false)
}

onMounted(() => {
  if (props.modelValue) open()
})

watch(
  () => props.modelValue,
  (value) => (value ? open() : close()),
)

onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="amber-dialog"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @cancel="onCancel"
    @keydown="onKeydown"
    @pointerdown="onPointerdown"
    @click="onClick"
    @close="onClose"
  >
    <div class="amber-dialog__panel">
      <h2 :id="titleId" class="amber-dialog__title">
        <slot name="title">{{ title }}</slot>
      </h2>
      <div v-if="$slots.default" class="amber-dialog__body"><slot /></div>
      <div v-if="$slots.actions" class="amber-dialog__actions"><slot name="actions" /></div>
    </div>
  </dialog>
</template>
