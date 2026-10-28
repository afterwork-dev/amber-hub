<template>
  <div class="investment-income-cards py-4">
    <div v-if="loading" class="investment-income-cards-state" aria-live="polite">
      <v-progress-circular indeterminate color="primary" aria-label="Loading your assets" />
      <p class="mt-4">Loading your assets…</p>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" role="alert">
      <p>{{ error }}</p>
      <v-btn text="Retry" variant="text" class="mt-2 px-0" @click="emit('retry')" />
    </v-alert>

    <div v-else-if="summaries.length === 0" class="investment-income-cards-state">
      <h2 class="text-h6">No assets yet</h2>
      <p class="text-medium-emphasis mt-2">Select “New Asset” to add your first asset.</p>
    </div>

    <template v-else>
      <v-row role="list">
        <v-col
          v-for="summary in summaries"
          :key="summary.assetId"
          role="listitem"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            tag="button"
            type="button"
            variant="tonal"
            class="h-100 investment-income-card"
            :aria-labelledby="`name-${summary.assetId}`"
            :aria-describedby="`total-${summary.assetId}`"
            @click="emit('select', summary.assetId)"
          >
            <v-card-item>
              <h2
                :id="`name-${summary.assetId}`"
                class="text-subtitle-1 investment-income-card-name"
              >
                {{ summary.name }}
              </h2>
              <p :id="`total-${summary.assetId}`" class="text-h6 mt-1">
                {{ formatEur(summary.totalCents) }}
              </p>
            </v-card-item>
          </v-card>
        </v-col>
      </v-row>

      <!-- Whatever belongs below the cards, shown only once they are. -->
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AssetIncomeSummary } from './assetIncome'
import { formatEur } from './formatEntry'

defineProps<{
  summaries: AssetIncomeSummary[]
  loading: boolean
  error?: string | null
}>()

const emit = defineEmits<{ retry: []; select: [assetId: string] }>()
</script>
