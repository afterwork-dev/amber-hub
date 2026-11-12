<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useId, watch } from 'vue'
import { appShellKey, nextShellId } from './appShell'

// The shell takes no props; the type exists so the component is exported like the others.
export type AmberAppShellProps = Record<string, never>

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const root = ref<HTMLElement>()
const overlay = ref<HTMLElement>()
const width = ref(0)
const open = ref(false)
const drawerId = `${useId()}-${nextShellId()}`

// The size classes come from the shell's own width, never the window's.
const size = computed(() =>
  width.value < 768 ? 'phone' : width.value < 1280 ? 'tablet' : 'desktop',
)
const narrow = computed(() => width.value < 1024)

let menuButton: HTMLElement | undefined

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeDrawer()
}

async function openDrawer() {
  if (!narrow.value || open.value) return
  open.value = true
  document.addEventListener('keydown', onKeydown)
  await nextTick()
  overlay.value?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
}

async function closeDrawer() {
  if (!open.value) return
  open.value = false
  document.removeEventListener('keydown', onKeydown)
  await nextTick()
  if (menuButton?.isConnected) menuButton.focus()
}

watch(narrow, (value) => {
  if (!value) closeDrawer()
})

provide(appShellKey, {
  narrow,
  open,
  drawerId,
  openDrawer,
  closeDrawer,
  registerMenuButton: (element) => (menuButton = element),
})

let observer: ResizeObserver | undefined
onMounted(() => {
  if (!root.value) return
  width.value = root.value.getBoundingClientRect().width
  observer = new ResizeObserver(([entry]) => {
    const inlineSize = entry?.borderBoxSize[0]?.inlineSize
    if (inlineSize !== undefined) width.value = inlineSize
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="root"
    class="amber-app-shell"
    :class="[`amber-app-shell--${size}`, { 'amber-app-shell--narrow': narrow }]"
  >
    <slot name="top-bar" />
    <div class="amber-app-shell__body">
      <slot v-if="!narrow" name="drawer" />
      <main class="amber-app-shell__content"><slot /></main>
    </div>
    <div v-if="narrow && open" ref="overlay" class="amber-app-shell__overlay">
      <div class="amber-app-shell__scrim" @click="closeDrawer" />
      <slot name="drawer" />
    </div>
  </div>
</template>
