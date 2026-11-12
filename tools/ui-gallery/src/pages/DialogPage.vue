<script setup lang="ts">
import { ref } from 'vue'
import { AmberButton, AmberDialog, useConfirm } from '@amber-hub/ui'

const confirm = useConfirm()

const basicOpen = ref(false)
const persistentOpen = ref(false)
const lastResult = ref<boolean>()

async function ask(options: Parameters<typeof confirm>[0]) {
  lastResult.value = await confirm(options)
}
</script>

<template>
  <h2 class="section-heading">Dialog</h2>
  <div class="row">
    <AmberButton @click="basicOpen = true">Open dialog</AmberButton>
    <AmberButton @click="persistentOpen = true">Open persistent dialog</AmberButton>
  </div>

  <h2 class="section-heading">Confirm</h2>
  <div class="row">
    <AmberButton
      @click="
        ask({ title: 'Archive budget?', message: 'You can restore it from the archive later.' })
      "
    >
      Confirm
    </AmberButton>
    <AmberButton
      @click="
        ask({
          title: 'Delete budget?',
          message: 'This removes the budget and its entries for good.',
          confirmLabel: 'Delete',
          destructive: true,
        })
      "
    >
      Delete
    </AmberButton>
  </div>
  <p class="result">Last result: {{ lastResult === undefined ? '—' : lastResult }}</p>

  <AmberDialog v-model="basicOpen" title="Rename budget">
    Pick a new name for this budget. Entries keep their history.
    <template #actions>
      <AmberButton variant="secondary" surface="raised" @click="basicOpen = false">
        Cancel
      </AmberButton>
      <AmberButton variant="primary" @click="basicOpen = false">Save</AmberButton>
    </template>
  </AmberDialog>

  <AmberDialog v-model="persistentOpen" persistent title="Finish setup">
    Escape and clicks outside do nothing here. Use the button to leave.
    <template #actions>
      <AmberButton variant="primary" @click="persistentOpen = false">Done</AmberButton>
    </template>
  </AmberDialog>
</template>

<style scoped>
.section-heading {
  margin: var(--amber-space-8) 0 var(--amber-space-4);
  font-size: var(--amber-type-subheading-size);
  font-weight: var(--amber-type-subheading-weight);
  line-height: var(--amber-type-subheading-line-height);
}

.section-heading:first-child {
  margin-top: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--amber-space-4);
}

.result {
  margin: var(--amber-space-4) 0 0;
}
</style>
