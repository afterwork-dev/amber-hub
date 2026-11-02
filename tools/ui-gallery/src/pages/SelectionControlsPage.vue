<script setup lang="ts">
import { ref } from 'vue'
import { AmberCheckbox, AmberRadio, AmberRadioGroup, AmberSwitch } from '@amber-hub/ui'

const switches = ref({ off: false, on: true, focus: false, disabledOff: false, disabledOn: true })

const checkboxes = ref({
  unchecked: false,
  indeterminate: false,
  checked: true,
  focus: false,
  disabledUnchecked: false,
  disabledChecked: true,
})
const indeterminate = ref(true)

const colour = ref('amber')
const focused = ref('selected')
const withDisabled = ref('first')
const disabledGroup = ref('selected')
</script>

<template>
  <h2 class="section-heading">Switch</h2>
  <div class="control-grid">
    <AmberSwitch v-model="switches.off" label="Off" />
    <AmberSwitch v-model="switches.on" label="On" />
    <AmberSwitch v-model="switches.focus" class="amber-is-focus" label="Focused" />
    <AmberSwitch v-model="switches.disabledOff" disabled label="Disabled off" />
    <AmberSwitch v-model="switches.disabledOn" disabled label="Disabled on" />
  </div>

  <h2 class="section-heading">Checkbox</h2>
  <div class="control-grid">
    <AmberCheckbox v-model="checkboxes.unchecked" label="Unchecked" />
    <AmberCheckbox v-model="checkboxes.checked" label="Checked" />
    <AmberCheckbox
      v-model="checkboxes.indeterminate"
      v-model:indeterminate="indeterminate"
      label="Indeterminate"
    />
    <AmberCheckbox v-model="checkboxes.focus" class="amber-is-focus" label="Focused" />
    <AmberCheckbox v-model="checkboxes.disabledUnchecked" disabled label="Disabled unchecked" />
    <AmberCheckbox v-model="checkboxes.disabledChecked" disabled label="Disabled checked" />
  </div>

  <h2 class="section-heading">Radio</h2>
  <div class="control-grid">
    <AmberRadioGroup v-model="colour" label="Colour">
      <AmberRadio value="amber" label="Amber" />
      <AmberRadio value="copper" label="Copper" />
      <AmberRadio value="slate" label="Slate" />
    </AmberRadioGroup>
    <AmberRadioGroup v-model="focused" label="Focused">
      <AmberRadio value="selected" class="amber-is-focus" label="Selected and focused" />
      <AmberRadio value="other" label="Unselected" />
    </AmberRadioGroup>
    <AmberRadioGroup v-model="withDisabled" label="With a disabled option">
      <AmberRadio value="first" label="First" />
      <AmberRadio value="second" disabled label="Second (disabled)" />
      <AmberRadio value="third" label="Third" />
    </AmberRadioGroup>
    <AmberRadioGroup v-model="disabledGroup" disabled label="Disabled">
      <AmberRadio value="selected" label="Disabled selected" />
      <AmberRadio value="other" label="Disabled unselected" />
    </AmberRadioGroup>
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

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--amber-space-6);
  align-items: start;
}
</style>
