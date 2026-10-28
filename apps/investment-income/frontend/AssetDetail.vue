<template>
  <v-app-bar absolute flat class="investment-income-detail-bar">
    <template #prepend>
      <v-btn
        :icon="ARROW_LEFT"
        variant="text"
        aria-label="Back to assets"
        @click="emit('back')"
      />
    </template>

    <v-app-bar-title>
      <h1 class="investment-income-title investment-income-detail-name">{{ name }}</h1>
    </v-app-bar-title>

    <template #append>
      <v-menu>
        <template #activator="{ props: activator }">
          <v-btn
            v-bind="activator"
            :icon="DOTS_VERTICAL"
            variant="text"
            aria-label="Asset actions"
          />
        </template>

        <v-list>
          <v-list-item title="Delete asset" @click="emit('delete-asset')" />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>

  <v-main class="investment-income-content">
    <div ref="list" tabindex="-1" class="investment-income-detail py-4">
      <div v-if="transactions.length === 0" class="investment-income-detail-state">
        <h2 class="text-h6">No transactions yet</h2>
        <p class="text-medium-emphasis mt-2">Payouts you record for this asset appear here.</p>
      </div>

      <v-list v-else role="list" bg-color="transparent">
        <v-list-item v-for="transaction in transactions" :key="transaction.id" role="listitem">
          <v-list-item-title>{{ formatPayoutDate(transaction.payoutDate) }}</v-list-item-title>

          <template #append>
            <span class="text-subtitle-1">{{ formatEur(transaction.amountCents) }}</span>

            <v-menu>
              <template #activator="{ props: activator }">
                <v-btn
                  v-bind="activator"
                  :icon="DOTS_VERTICAL"
                  variant="text"
                  class="ml-2"
                  :aria-label="actionsLabel(transaction)"
                />
              </template>

              <v-list>
                <v-list-item
                  title="Delete"
                  @click="emit('delete-transaction', transaction.id)"
                />
              </v-list>
            </v-menu>
          </template>
        </v-list-item>
      </v-list>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { InvestmentIncomeEntry } from '../shared/types'
import { formatEur, formatPayoutDate } from './formatEntry'
import { ARROW_LEFT, DOTS_VERTICAL } from './icons'

defineProps<{
  name: string
  transactions: InvestmentIncomeEntry[]
}>()

const emit = defineEmits<{
  back: []
  'delete-transaction': [entryId: string]
  'delete-asset': []
}>()

const list = ref<HTMLElement | null>(null)

function actionsLabel(transaction: InvestmentIncomeEntry): string {
  return `Actions for ${formatPayoutDate(transaction.payoutDate)}, ${formatEur(transaction.amountCents)}`
}

/**
 * A deleted row takes its menu activator with it, so the shell puts focus back here rather than
 * letting it fall to the page.
 */
function focusList(): void {
  list.value?.focus()
}

defineExpose({ focusList })
</script>
