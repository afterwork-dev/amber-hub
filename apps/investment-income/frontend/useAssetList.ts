import { ref } from 'vue'
import { callAppApi } from '@amber-hub/app-sdk'
import type { InvestmentIncomeAsset } from '../shared/types'
import { compareAssetNames } from './assetOrder'

const LOAD_FAILED = 'The assets could not be loaded. Check your connection and try again.'

/** The dropdown reads this list directly, so it is kept in the order the cards use. */
function compareAssets(a: InvestmentIncomeAsset, b: InvestmentIncomeAsset): number {
  const byName = compareAssetNames(a.name, b.name)
  return byName !== 0 ? byName : a.id.localeCompare(b.id)
}

export function useAssetList() {
  const assets = ref<InvestmentIncomeAsset[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadAssets(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await callAppApi<{ assets: InvestmentIncomeAsset[] }>('investment-income', 'GET', '/assets')
      assets.value = [...result.assets].sort(compareAssets)
    } catch {
      error.value = LOAD_FAILED
    } finally {
      loading.value = false
    }
  }

  /** Slots an already-stored asset into name order, sparing the list a refetch. */
  function addAsset(asset: InvestmentIncomeAsset): void {
    assets.value = [asset, ...assets.value].sort(compareAssets)
  }

  function removeAsset(id: string): void {
    assets.value = assets.value.filter((asset) => asset.id !== id)
  }

  return { assets, loading, error, loadAssets, addAsset, removeAsset }
}
