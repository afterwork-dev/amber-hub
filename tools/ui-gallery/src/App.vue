<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { groups, pages } from './pages'
import { findPreset, frameWidthKey, viewportPresets, type ViewportPreset } from './viewports'

const route = useRoute()
const router = useRouter()

const preset = computed(() => findPreset(route.query.viewport))
const viewportQuery = computed(() => (preset.value ? { viewport: preset.value.id } : {}))
const title = computed(() => pages.find((page) => page.path === route.path)?.title)

const nav = groups.map((group) => ({
  group,
  pages: pages.filter((page) => page.group === group),
}))

function select(next: ViewportPreset | undefined) {
  const query = { ...route.query }
  if (next) query.viewport = next.id
  else delete query.viewport
  router.push({ query })
}

const frame = ref<HTMLElement>()
const frameWidth = ref(0)
provide(frameWidthKey, frameWidth)

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) frameWidth.value = entry.borderBoxSize[0]?.inlineSize ?? 0
  })
  if (frame.value) observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="gallery">
    <nav class="gallery-nav" aria-label="Gallery pages">
      <p class="gallery-brand">AmberUI</p>
      <section v-for="entry in nav" :key="entry.group" class="gallery-nav-group">
        <h2 class="gallery-nav-heading">{{ entry.group }}</h2>
        <ul v-if="entry.pages.length" class="gallery-nav-list">
          <li v-for="page in entry.pages" :key="page.path">
            <RouterLink class="gallery-nav-link" :to="{ path: page.path, query: viewportQuery }">
              {{ page.title }}
            </RouterLink>
          </li>
        </ul>
        <p v-else class="gallery-nav-empty">No pages yet</p>
      </section>
    </nav>

    <div class="gallery-main">
      <div class="gallery-toolbar" role="toolbar" aria-label="Viewport">
        <button
          v-for="option in viewportPresets"
          :key="option.id"
          type="button"
          class="gallery-toolbar-button"
          :aria-pressed="preset?.id === option.id ? 'true' : 'false'"
          @click="select(option)"
        >
          {{ option.label }}
        </button>
        <button
          type="button"
          class="gallery-toolbar-button"
          :aria-pressed="preset ? 'false' : 'true'"
          @click="select(undefined)"
        >
          Full
        </button>
      </div>

      <main class="gallery-content">
        <div
          ref="frame"
          class="gallery-frame"
          data-testid="frame"
          :style="preset ? { width: `${preset.width}px` } : undefined"
        >
          <h1 class="gallery-title">{{ title }}</h1>
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
