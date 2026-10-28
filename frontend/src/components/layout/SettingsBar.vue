<template>
  <AppBar>
    <v-btn
      icon="mdi-arrow-left"
      variant="text"
      aria-label="Back"
      :to="{ name: 'dashboard' }"
      class="ml-2"
    />
    <v-app-bar-title>Settings</v-app-bar-title>
  </AppBar>
</template>

<script setup lang="ts">
import AppBar from './AppBar.vue'
</script>
