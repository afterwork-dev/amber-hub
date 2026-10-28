import type { AppManager, ToolDefinition } from '@amber-hub/app-sdk/backend'
import { ENTRY_CATEGORIES } from '../shared/entry-categories'
import { MAX_NAME_LENGTH, MAX_SERIAL_NO_LENGTH } from '../shared/entry-limits'
import { LOCATIONS } from '../shared/locations'
import type { NewEntryInput } from '../shared/types'
import { createEntry, listEntries } from './entries'

const DEFAULT_LIMIT = 20
const CATEGORY_IDS = ENTRY_CATEGORIES.map((category) => category.id)
const LOCATION_IDS = LOCATIONS.map((location) => location.id)

function listEntriesTool(appManager: AppManager): ToolDefinition<{ limit?: number }> {
  return {
    name: 'list-entries',
    description:
      'Lists your treasury entries, newest first. Use limit to cap how many are returned.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    handler: async (context) => ({
      entries: await listEntries(appManager, context.user, context.input.limit ?? DEFAULT_LIMIT),
    }),
  }
}

function addEntryTool(appManager: AppManager): ToolDefinition<NewEntryInput> {
  return {
    name: 'add-entry',
    description:
      `Adds a treasury entry you own. categoryId must be one of: ${CATEGORY_IDS.join(', ')}. ` +
      `locationId must be one of: ${LOCATION_IDS.join(', ')}. ` +
      'purchaseDate is a past YYYY-MM-DD date; purchaseValueCents is whole euro cents.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: MAX_NAME_LENGTH },
        categoryId: { type: 'string', enum: CATEGORY_IDS },
        locationId: { type: 'string', enum: LOCATION_IDS },
        serialNo: { type: 'string', maxLength: MAX_SERIAL_NO_LENGTH },
        purchaseDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        purchaseValueCents: { type: 'integer', minimum: 0 },
      },
      required: ['name', 'categoryId', 'locationId'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false },
    handler: (context) => createEntry(appManager, context.user, context.input),
  }
}

export function registerTools(appManager: AppManager): void {
  appManager.registerTool(listEntriesTool(appManager))
  appManager.registerTool(addEntryTool(appManager))
}
