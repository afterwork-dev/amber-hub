<template>
  <div>
    <div v-if="loading" role="status" aria-live="polite" class="d-flex align-center ga-3">
      <v-progress-circular indeterminate color="primary" size="24" />
      <span>Loading…</span>
    </div>
    <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>
    <div v-show="!loading && !error" ref="container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useAppFrontendLoader } from '../../composables/useAppFrontendLoader'

const props = defineProps<{ appId: string; entry: string }>()

const container = ref<HTMLElement | null>(null)
const { load, unload, loading, error } = useAppFrontendLoader(container)

onMounted(() => {
  load(props.appId, props.entry)
})

watch(
  () => [props.appId, props.entry],
  () => {
    load(props.appId, props.entry)
  },
)

onBeforeUnmount(() => {
  unload()
})
</script>
