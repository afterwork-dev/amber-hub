<template>
  <v-card variant="tonal" class="h-100">
    <v-card-item>
      <v-card-title tag="h2" class="text-subtitle-1">{{ title }}</v-card-title>
      <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    </v-card-item>

    <v-card-text>
      <slot />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>
