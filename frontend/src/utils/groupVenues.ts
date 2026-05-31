import type { Venue } from "../data/venues"

export type VenueGroup = {
  key: string
  name: string
  lat: number
  lng: number
  venues: Venue[]
}

export function groupVenues(venues: Venue[]): VenueGroup[] {
  const map = new Map<string, Venue[]>()

  for (const venue of venues) {
    const key = venue.name?.trim().toLowerCase() || `${venue.lat.toFixed(4)},${venue.lng.toFixed(4)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(venue)
  }

  return Array.from(map.entries()).map(([key, group]) => ({
    key,
    name: group[0].name || "Okänt ställe",
    lat: group.reduce((s, v) => s + v.lat, 0) / group.length,
    lng: group.reduce((s, v) => s + v.lng, 0) / group.length,
    venues: group,
  }))
}
