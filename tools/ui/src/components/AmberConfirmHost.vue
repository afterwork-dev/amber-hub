<script setup lang="ts">
import { nextTick, onBeforeUnmount, provide, ref } from 'vue'
import AmberConfirmDialog from './AmberConfirmDialog.vue'
import { confirmKey, type AmberConfirmOptions } from './useConfirm'

interface Request {
  options: AmberConfirmOptions
  resolve: (value: boolean) => void
}

const open = ref(false)
const options = ref<AmberConfirmOptions>({ title: '', message: '' })
let current: Request | undefined
// True from a close until the dialog has really closed, so a request made from the answer's
// continuation queues instead of reopening in the same tick.
let closing = false
const queue: Request[] = []

function showNext() {
  const next = queue.shift()
  if (!next) return
  current = next
  options.value = next.options
  open.value = true
}

provide(confirmKey, (requested) => {
  return new Promise<boolean>((resolve) => {
    queue.push({ options: requested, resolve })
    if (!current && !closing) showNext()
  })
})

function onResult(value: boolean) {
  current?.resolve(value)
}

function onUpdate(value: boolean) {
  if (value || !current) return
  open.value = false
  current = undefined
  closing = true
  // Wait for the dialog to close before the next request opens it again.
  nextTick(() => {
    closing = false
    showNext()
  })
}

// Nobody is left to answer, so every pending request resolves false.
onBeforeUnmount(() => {
  for (const request of [current, ...queue.splice(0)]) request?.resolve(false)
  current = undefined
})
</script>

<template>
  <slot />
  <AmberConfirmDialog
    v-bind="options"
    :model-value="open"
    @result="onResult"
    @update:model-value="onUpdate"
  />
</template>
