<template>
  <SettingsBar />
  <SettingsDrawer />
  <v-main>
    <router-view />
  </v-main>
</template>

<script setup lang="ts">
import SettingsBar from '../../components/layout/SettingsBar.vue'
import SettingsDrawer from '../../components/layout/SettingsDrawer.vue'
</script>
