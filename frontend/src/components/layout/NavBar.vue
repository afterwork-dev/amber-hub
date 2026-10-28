<template>
  <AppBar>
    <v-spacer />
    <v-menu>
      <template #activator="{ props: menuProps }">
        <v-btn
          class="text-none mr-4"
          variant="tonal"
          prepend-icon="mdi-account"
          v-bind="menuProps"
        >
          Hello, {{ authStore.username }}
        </v-btn>
      </template>
      <v-list>
        <v-list-item title="Settings" :to="{ name: 'settings-api-key' }" />
        <v-list-item title="Logout" @click="logout" />
      </v-list>
    </v-menu>
  </AppBar>
</template>

<script setup lang="ts">
import AppBar from './AppBar.vue'
import { useAuthStore } from '../../stores/authStore'
import { useLogout } from '../../composables/useLogout'

const authStore = useAuthStore()
const { logout } = useLogout()
</script>
