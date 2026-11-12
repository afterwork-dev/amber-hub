<script setup lang="ts">
import { computed, inject, type ComponentPublicInstance } from 'vue'
import { Menu } from '../icons'
import { appShellKey } from './appShell'
import AmberIconButton from './AmberIconButton.vue'

export interface AmberTopBarProps {
  appName: string
  navLabel?: string
  menuLabel?: string
}

withDefaults(defineProps<AmberTopBarProps>(), {
  navLabel: 'Sections',
  menuLabel: 'Open navigation',
})

const shell = inject(appShellKey, undefined)
const showMenu = computed(() => shell?.narrow.value === true)

function registerMenuButton(target: Element | ComponentPublicInstance | null) {
  const element = target && '$el' in target ? target.$el : undefined
  shell?.registerMenuButton(element instanceof HTMLElement ? element : undefined)
}
</script>

<template>
  <header class="amber-top-bar">
    <AmberIconButton
      v-if="showMenu && shell"
      :ref="registerMenuButton"
      :icon="Menu"
      :ariaLabel="menuLabel"
      :aria-expanded="shell.open.value ? 'true' : 'false'"
      :aria-controls="shell.drawerId"
      @click="shell.openDrawer()"
    />
    <span class="amber-app-mark" aria-hidden="true" />
    <span class="amber-top-bar__name">{{ appName }}</span>
    <nav v-if="$slots.default" class="amber-top-bar__nav" :aria-label="navLabel">
      <slot />
    </nav>
    <div v-if="$slots.end" class="amber-top-bar__end"><slot name="end" /></div>
  </header>
</template>
