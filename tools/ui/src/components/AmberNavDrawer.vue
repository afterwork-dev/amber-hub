<script setup lang="ts">
import { inject } from 'vue'
import { appShellKey } from './appShell'

export interface AmberNavDrawerProps {
  appName: string
  label?: string
}

withDefaults(defineProps<AmberNavDrawerProps>(), {
  label: 'Main',
})

const shell = inject(appShellKey, undefined)
</script>

<template>
  <nav :id="shell?.drawerId" class="amber-nav-drawer" :aria-label="label">
    <div class="amber-nav-drawer__header">
      <span class="amber-app-mark" aria-hidden="true" />
      <span class="amber-nav-drawer__name">{{ appName }}</span>
    </div>
    <div class="amber-nav-drawer__sections"><slot /></div>
    <div v-if="$slots.account" class="amber-nav-drawer__account"><slot name="account" /></div>
  </nav>
</template>
