<script setup lang="ts">
import { watch } from 'vue'
import AmberButton from './AmberButton.vue'
import AmberDialog from './AmberDialog.vue'

export interface AmberConfirmDialogProps {
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

const props = withDefaults(defineProps<AmberConfirmDialogProps>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  result: [value: boolean]
}>()

// Escape can arrive as both a keydown and a cancel event; the answer counts once per opening.
let settled = false

watch(
  () => props.modelValue,
  (value) => {
    if (value) settled = false
  },
)

function finish(value: boolean) {
  if (settled) return
  settled = true
  emit('result', value)
  emit('update:modelValue', false)
}

function onUpdate(value: boolean) {
  if (!value) finish(false)
}
</script>

<template>
  <AmberDialog :model-value="modelValue" :title="title" @update:model-value="onUpdate">
    {{ message }}
    <template #actions>
      <AmberButton variant="secondary" surface="raised" @click="finish(false)">
        {{ cancelLabel }}
      </AmberButton>
      <AmberButton
        :variant="destructive ? 'danger' : 'primary'"
        surface="raised"
        @click="finish(true)"
      >
        {{ confirmLabel }}
      </AmberButton>
    </template>
  </AmberDialog>
</template>
