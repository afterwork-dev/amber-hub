<template>
  <NavBar />
  <HomeDrawer />
  <v-main>
    <router-view />
  </v-main>
</template>

<script setup lang="ts">
import NavBar from '../../components/layout/NavBar.vue'
import HomeDrawer from '../../components/layout/HomeDrawer.vue'
</script>
