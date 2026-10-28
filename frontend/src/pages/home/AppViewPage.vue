<template>
  <v-container>
    <AppFrontendHost v-if="frontend" :app-id="props.appId" :entry="frontend.entry" />
    <h1 v-else-if="displayName">{{ displayName }}</h1>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppsStore } from '../../stores/appsStore'
import AppFrontendHost from '../../components/apps/AppFrontendHost.vue'

const props = defineProps<{ appId: string }>()

const router = useRouter()
const appsStore = useAppsStore()

const displayName = computed(() => appsStore.appFor(props.appId)?.displayName)
const frontend = computed(() => appsStore.appFor(props.appId)?.frontend ?? null)

function redirectIfAppMissing(): void {
  if (!appsStore.loading && appsStore.apps.length > 0 && !displayName.value) {
    router.push({ name: 'dashboard' })
  }
}

onMounted(() => {
  if (appsStore.apps.length === 0) {
    appsStore.load().then(redirectIfAppMissing)
  } else {
    redirectIfAppMissing()
  }
})

watch(() => appsStore.apps, redirectIfAppMissing)
</script>
