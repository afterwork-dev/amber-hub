<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from '../icons'

export interface AmberAccountSwitcherProps {
  name: string
}

const props = defineProps<AmberAccountSwitcherProps>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()

// The first letters of the first two words.
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <button type="button" class="amber-account-switcher" @click="emit('click', $event)">
    <span class="amber-account-switcher__avatar" aria-hidden="true">{{ initials }}</span>
    <span class="amber-account-switcher__name">{{ name }}</span>
    <ChevronRight class="amber-account-switcher__chevron" aria-hidden="true" :size="20" />
  </button>
</template>
