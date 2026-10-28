import type { AppManager, ToolDefinition } from '@amber-hub/app-sdk/backend'
import { createEntry, listAssets } from './entries'
import { InvalidRecordError, centsFromEuros } from './validation'

interface AddEntryInput {
  payoutDate: string
  amount: number
  assetId: string
}

function listAssetsTool(appManager: AppManager): ToolDefinition {
  return {
    name: 'list-assets',
    description:
      'Lists your Investment Income assets with their id, name, and booking name. ' +
      'Call this first to find the assetId for add-entry.',
    inputSchema: { type: 'object', additionalProperties: false },
    annotations: { readOnlyHint: true },
    handler: async (context) => ({ assets: await listAssets(appManager, context.user) }),
  }
}

function addEntryTool(appManager: AppManager): ToolDefinition<AddEntryInput> {
  return {
    name: 'add-entry',
    description:
      'Records an income payout you received from one of your assets. ' +
      'payoutDate is a YYYY-MM-DD date that is not in the future. ' +
      'amount is in euros, greater than zero, with at most two decimals (12.5 means 12,50 €). ' +
      'assetId must come from list-assets.',
    inputSchema: {
      type: 'object',
      properties: {
        payoutDate: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Payout date, YYYY-MM-DD, not in the future.',
        },
        amount: {
          type: 'number',
          exclusiveMinimum: 0,
          description: 'Amount in euros, at most two decimals.',
        },
        assetId: {
          type: 'string',
          minLength: 1,
          description: 'Id of one of your assets (see list-assets).',
        },
      },
      required: ['payoutDate', 'amount', 'assetId'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false },
    handler: async (context) => {
      const { payoutDate, amount, assetId } = context.input

      try {
        const amountCents = centsFromEuros(amount)
        return await createEntry(appManager, context.user, { payoutDate, amountCents, assetId })
      } catch (error) {
        if (error instanceof InvalidRecordError) return { error: error.message }
        throw error
      }
    },
  }
}

export function registerTools(appManager: AppManager): void {
  appManager.registerTool(listAssetsTool(appManager))
  appManager.registerTool(addEntryTool(appManager))
}
