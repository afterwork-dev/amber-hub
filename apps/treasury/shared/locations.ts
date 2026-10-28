
export interface Location {
  id: string
  name: string
}

export const LOCATIONS: readonly Location[] = Object.freeze([
  { id: 'location-1', name: 'Location 1' },
  { id: 'location-2', name: 'Location 2' },
])

export function isKnownLocationId(id: string): boolean {
  return LOCATIONS.some((location) => location.id === id)
}

export function findLocationName(id: string): string {
  return LOCATIONS.find((location) => location.id === id)?.name ?? id
}
