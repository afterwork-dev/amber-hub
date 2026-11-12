<script setup lang="ts">
import { ref } from 'vue'
import {
  AmberButton,
  AmberCard,
  AmberRadio,
  AmberRadioGroup,
  AmberSelect,
  AmberSwitch,
  AmberTextField,
} from '@amber-hub/ui'
import DemoShell from '../components/DemoShell.vue'

const name = ref('')
const currency = ref('eur')
const period = ref('monthly')
const shared = ref(false)

const currencies = [
  { value: 'eur', label: 'Euro' },
  { value: 'usd', label: 'US dollar' },
  { value: 'gbp', label: 'Pound sterling' },
]
</script>

<template>
  <DemoShell>
    <AmberCard class="demo-span-form">
      <template #title>New budget</template>
      <div class="demo-form-fields">
        <AmberTextField v-model="name" label="Name" />
        <AmberSelect v-model="currency" label="Currency" :items="currencies" />
        <AmberRadioGroup v-model="period" label="Period">
          <AmberRadio value="monthly" label="Monthly" />
          <AmberRadio value="yearly" label="Yearly" />
        </AmberRadioGroup>
        <AmberSwitch v-model="shared" label="Share with household" />
      </div>
      <template #actions>
        <div class="demo-form-actions">
          <AmberButton variant="primary">Save</AmberButton>
          <AmberButton variant="secondary">Cancel</AmberButton>
        </div>
      </template>
    </AmberCard>
  </DemoShell>
</template>
