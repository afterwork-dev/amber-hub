import type { AppManager, ToolDefinition } from '@amber-hub/app-sdk/backend'
import { CATEGORIES, type Category } from '../shared/categories'
import { MAX_ENTRIES_PER_MONTH, MAX_NAME_LENGTH } from '../shared/entry-limits'
import { entryValueCents } from '../shared/entryValue'
import { totalsOf } from '../shared/totals'
import type { NetworthEntry } from '../shared/types'
import { addEntries, listEntries } from './entries'
import { centsFromEuros, InvalidRecordError } from './validation'

const DEFAULT_MONTHS = 3
const CATEGORY_VALUES = CATEGORIES.map((category) => category.value)

interface AddEntriesInput {
  month: string
  entries: { name: string; category: Category; amount: number; quantity?: number }[]
}

const euros = (cents: number): number => cents / 100

function monthView(month: string, entries: NetworthEntry[]) {
  const totals = totalsOf(entries.map(entryValueCents))

  return {
    month,
    assets: euros(totals.assetsCents),
    liabilities: euros(totals.liabilitiesCents),
    networth: euros(totals.networthCents),
    entries: entries.map(({ name, category, amountCents, quantity }) => ({
      name,
      category,
      amount: euros(amountCents),
      quantity,
    })),
  }
}

function listMonthsTool(appManager: AppManager): ToolDefinition<{ limit?: number }> {
  return {
    name: 'list-months',
    description:
      'Lists your recorded net worth months, newest first: every entry with its category, ' +
      'amount in euros per unit and quantity, plus the month totals in euros. ' +
      'Call this before add-entries to reuse the existing entry names and categories.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 120,
          description: `How many of the most recent months to return. Defaults to ${DEFAULT_MONTHS}.`,
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    handler: async (context) => {
      const entries = await listEntries(appManager, context.user)
      const months = [...new Set(entries.map((entry) => entry.month))].slice(
        0,
        context.input.limit ?? DEFAULT_MONTHS,
      )

      return {
        months: months.map((month) =>
          monthView(
            month,
            entries.filter((entry) => entry.month === month),
          ),
        ),
      }
    },
  }
}

function addEntriesTool(appManager: AppManager): ToolDefinition<AddEntriesInput> {
  return {
    name: 'add-entries',
    description:
      'Records balances for one month, for example read from a screenshot of a banking app. ' +
      'An entry whose name already exists in that month is updated; every other entry of the ' +
      'month stays as it is, so a month can be filled from several screenshots. ' +
      'Call list-months first and reuse existing names and categories exactly, so each position ' +
      'stays one line over time. Liabilities (credit card balances, loans, mortgage) are negative ' +
      'amounts. The result lists entries of the previous month that this month is still missing.',
    inputSchema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
          description: 'The month the balances belong to, YYYY-MM, not in the future.',
        },
        entries: {
          type: 'array',
          minItems: 1,
          maxItems: MAX_ENTRIES_PER_MONTH,
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: MAX_NAME_LENGTH,
                description: 'The position, e.g. "Main Account". Reuse the name from list-months.',
              },
              category: { type: 'string', enum: CATEGORY_VALUES },
              amount: {
                type: 'number',
                description: 'Euros per unit, at most two decimals. Negative for liabilities.',
              },
              quantity: {
                type: 'number',
                exclusiveMinimum: 0,
                description: 'Units held, e.g. 3 gold coins worth amount each. Defaults to 1.',
              },
            },
            required: ['name', 'category', 'amount'],
            additionalProperties: false,
          },
        },
      },
      required: ['month', 'entries'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: true },
    handler: async (context) => {
      try {
        const added = await addEntries(
          appManager,
          context.user,
          context.input.month,
          context.input.entries.map(({ name, category, amount, quantity }) => ({
            name,
            category,
            amountCents: centsFromEuros(amount),
            quantity: quantity ?? 1,
          })),
        )
        return {
          ...monthView(added.month, added.entries),
          missingFromPreviousMonth: added.missingFromPreviousMonth,
        }
      } catch (error) {
        if (error instanceof InvalidRecordError) return { error: error.message }
        throw error
      }
    },
  }
}

export function registerTools(appManager: AppManager): void {
  appManager.registerTool(listMonthsTool(appManager))
  appManager.registerTool(addEntriesTool(appManager))
}
