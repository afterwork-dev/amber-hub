import { MAX_BOOKING_NAME_LENGTH, MAX_NAME_LENGTH } from '../shared/entry-limits'
import type { NewAssetInput } from '../shared/types'
import { requireKnownFieldsOnly, requireText } from './validation'

const ALLOWED_FIELDS = ['name', 'bookingName']

export function validateNewAsset(body: unknown): NewAssetInput {
  const source = requireKnownFieldsOnly(body, ALLOWED_FIELDS)

  const asset: NewAssetInput = {
    name: requireText(source.name, 'name', MAX_NAME_LENGTH),
  }

  if (source.bookingName !== undefined) {
    asset.bookingName = requireText(source.bookingName, 'bookingName', MAX_BOOKING_NAME_LENGTH)
  }

  return asset
}
