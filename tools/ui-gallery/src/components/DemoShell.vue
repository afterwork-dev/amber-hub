<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AmberAccountSwitcher,
  AmberAppShell,
  AmberIconButton,
  AmberNavDrawer,
  AmberNavItem,
  AmberNavSection,
  AmberTopBar,
} from '@amber-hub/ui'
import { Bell } from '@amber-hub/ui/icons'
import { pages } from '../pages'
import { findPreset } from '../viewports'

const route = useRoute()

const layoutPages = pages.filter((page) => page.group === 'Layouts')
// Each link keeps the current viewport preset.
const query = computed(() => {
  const preset = findPreset(route.query.viewport)
  return preset ? { viewport: preset.id } : {}
})
</script>

<template>
  <AmberAppShell>
    <template #top-bar>
      <AmberTopBar app-name="Amber Hub">
        <template #end>
          <AmberIconButton :icon="Bell" ariaLabel="Notifications" dot />
          <span class="demo-avatar" aria-hidden="true">AL</span>
        </template>
      </AmberTopBar>
    </template>

    <template #drawer>
      <AmberNavDrawer app-name="Amber Hub">
        <AmberNavSection label="Layouts">
          <AmberNavItem
            v-for="page in layoutPages"
            :key="page.path"
            :as="RouterLink"
            :to="{ path: page.path, query }"
            :active="route.path === page.path"
          >
            {{ page.title }}
          </AmberNavItem>
        </AmberNavSection>
        <AmberNavSection label="Workspace">
          <AmberNavItem href="#">Overview</AmberNavItem>
          <AmberNavItem href="#">Reports</AmberNavItem>
          <AmberNavItem href="#">Settings</AmberNavItem>
        </AmberNavSection>
        <template #account>
          <AmberAccountSwitcher name="Ada Lovelace" />
        </template>
      </AmberNavDrawer>
    </template>

    <slot />
  </AmberAppShell>
</template>
