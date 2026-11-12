<template>
  <v-navigation-drawer permanent>
    <v-list>
      <v-list-item title="API Key" :to="{ name: 'settings-api-key' }" exact />
      <v-list-item title="Backups" :to="{ name: 'settings-backups' }" />
    </v-list>
  </v-navigation-drawer>
</template>
