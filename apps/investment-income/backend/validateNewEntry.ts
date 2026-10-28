import { MAX_NAME_LENGTH } from '../shared/entry-limits'
import type { NewEntryInput } from '../shared/types'
import { requireCalendarDate, requireCents, requireKnownFieldsOnly, requireText } from './validation'

const ALLOWED_FIELDS = ['payoutDate', 'amountCents', 'assetId']

export function validateNewEntry(body: unknown): NewEntryInput {
  const source = requireKnownFieldsOnly(body, ALLOWED_FIELDS)

  return {
    payoutDate: requireCalendarDate(source.payoutDate, 'payoutDate'),
    amountCents: requireCents(source.amountCents, 'amountCents'),
    assetId: requireText(source.assetId, 'assetId', MAX_NAME_LENGTH),
  }
}
