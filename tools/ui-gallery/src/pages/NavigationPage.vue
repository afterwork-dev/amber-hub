<script setup lang="ts">
import {
  AmberAccountSwitcher,
  AmberIconButton,
  AmberNavDrawer,
  AmberNavItem,
  AmberNavSection,
  AmberTopBar,
} from '@amber-hub/ui'
import { Bell } from '@amber-hub/ui/icons'
</script>

<template>
  <h2 class="section-heading">Top bar</h2>
  <AmberTopBar app-name="Amber Hub">
    <AmberNavItem href="#">Overview</AmberNavItem>
    <AmberNavItem href="#" active>Budgets</AmberNavItem>
    <AmberNavItem href="#" class="amber-is-hover">Reports</AmberNavItem>
    <template #end>
      <AmberIconButton :icon="Bell" ariaLabel="Notifications" dot />
      <span class="demo-avatar" aria-hidden="true">AL</span>
    </template>
  </AmberTopBar>

  <h2 class="section-heading">Drawer</h2>
  <AmberNavDrawer app-name="Amber Hub">
    <AmberNavSection label="Budgets">
      <AmberNavItem href="#" active>Overview</AmberNavItem>
      <AmberNavItem href="#" class="amber-is-hover">Accounts</AmberNavItem>
      <AmberNavItem href="#">Categories</AmberNavItem>
    </AmberNavSection>
    <AmberNavSection label="Settings">
      <AmberNavItem href="#">Profile</AmberNavItem>
    </AmberNavSection>
    <template #account>
      <AmberAccountSwitcher name="Ada Lovelace" />
    </template>
  </AmberNavDrawer>
</template>

<style scoped>
.section-heading {
  margin: var(--amber-space-8) 0 var(--amber-space-4);
  font-size: var(--amber-type-subheading-size);
  font-weight: var(--amber-type-subheading-weight);
  line-height: var(--amber-type-subheading-line-height);
}

.section-heading:first-child {
  margin-top: 0;
}
</style>
