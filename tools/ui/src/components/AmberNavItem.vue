<script setup lang="ts">
import { computed, type Component } from 'vue'

export interface AmberNavItemProps {
  to?: string | Record<string, unknown>
  href?: string
  active?: boolean
  as?: string | Component
}

const props = withDefaults(defineProps<AmberNavItemProps>(), {
  to: undefined,
  href: undefined,
  active: false,
  as: undefined,
})

// Only the given keys are passed on, so a component such as a router link keeps its own default.
const linkProps = computed(() => {
  if (props.as) {
    return {
      ...(props.to !== undefined && { to: props.to }),
      ...(props.href !== undefined && { href: props.href }),
    }
  }
  const href = props.href ?? (typeof props.to === 'string' ? props.to : undefined)
  return href === undefined ? {} : { href }
})
</script>

<template>
  <component
    :is="as ?? 'a'"
    v-bind="linkProps"
    class="amber-nav-item"
    :class="{ 'amber-nav-item--active': active }"
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </component>
</template>
