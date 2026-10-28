<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSessionGuard } from './composables/useSessionGuard'

const { checkSession } = useSessionGuard()

onMounted(() => {
  checkSession()
})
</script>
