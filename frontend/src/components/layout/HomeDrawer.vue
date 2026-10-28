<template>
  <v-navigation-drawer permanent>
    <v-list>
      <v-list-item title="Dashboard" :to="{ name: 'dashboard' }" />
      <v-divider />
      <v-list-item
        v-for="app in appsStore.apps"
        :key="app.id"
        :title="app.displayName"
        :to="{ name: 'app-view', params: { appId: app.id } }"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppsStore } from '../../stores/appsStore'

const appsStore = useAppsStore()

onMounted(() => {
  if (appsStore.apps.length === 0) {
    appsStore.load()
  }
})
</script>
