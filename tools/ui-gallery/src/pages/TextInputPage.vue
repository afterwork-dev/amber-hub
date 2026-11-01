<script setup lang="ts">
import { ref } from 'vue'
import { AmberSelect, AmberTextField } from '@amber-hub/ui'
import { Search } from '@amber-hub/ui/icons'

const items = [
  { value: 'amber', label: 'Amber' },
  { value: 'copper', label: 'Copper' },
  { value: 'slate', label: 'Slate' },
]

const textStates = [
  { id: 'default', label: 'Default' },
  { id: 'focus', label: 'Focused', class: 'amber-is-focus' },
  { id: 'filled', label: 'Filled' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'error', label: 'Error' },
  { id: 'hint', label: 'With hint' },
  { id: 'icon', label: 'With icon' },
] as const
const selectStates = textStates.map((state) =>
  state.id === 'icon' ? { ...state, label: 'With icon (chevron)' } : state,
)

const textValues = ref<Record<string, string>>({
  default: '',
  focus: '',
  filled: 'hello@amber.example',
  disabled: 'Disabled value',
  error: 'not-an-email',
  hint: '',
  icon: '',
})
const selectValues = ref<Record<string, string | undefined>>({
  default: undefined,
  focus: undefined,
  filled: 'copper',
  disabled: 'amber',
  error: undefined,
  hint: undefined,
  icon: undefined,
})
</script>

<template>
  <h2 class="section-heading">Text input</h2>
  <div class="field-grid">
    <figure v-for="state in textStates" :key="state.id" class="field-cell">
      <AmberTextField
        v-model="textValues[state.id]"
        :label="state.label"
        :class="'class' in state ? state.class : undefined"
        :placeholder="state.id === 'default' ? 'Placeholder' : undefined"
        :disabled="state.id === 'disabled'"
        :error="state.id === 'error' ? 'Enter a valid email address' : undefined"
        :hint="state.id === 'hint' ? 'We never share your email' : undefined"
        :leading-icon="state.id === 'icon' ? Search : undefined"
      />
    </figure>
  </div>

  <h2 class="section-heading">Select</h2>
  <div class="field-grid">
    <figure v-for="state in selectStates" :key="state.id" class="field-cell">
      <AmberSelect
        v-model="selectValues[state.id]"
        :items="items"
        :label="state.label"
        :class="'class' in state ? state.class : undefined"
        :disabled="state.id === 'disabled'"
        :error="state.id === 'error' ? 'Choose a colour' : undefined"
        :hint="state.id === 'hint' ? 'You can change this later' : undefined"
      />
    </figure>
  </div>
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

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--amber-space-6);
}

.field-cell {
  margin: 0;
}
</style>
