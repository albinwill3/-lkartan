import type { Venue } from "../data/venues"
import type { Report } from "../data/reports"

export type VenueGroup = {
  id: number
  key: string
  name: string
  lat: number
  lng: number
  reports: Report[]
}

export function groupVenues(venues: Venue[], reports: Report[]): VenueGroup[] {
  const reportsByVenue = new Map<number, Report[]>()

  for (const report of reports) {
    if (!reportsByVenue.has(report.venue_id)) reportsByVenue.set(report.venue_id, [])
    reportsByVenue.get(report.venue_id)!.push(report)
  }

  return venues.map((venue) => ({
    id: venue.id,
    key: String(venue.id),
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng,
    reports: reportsByVenue.get(venue.id) ?? [],
  }))
}
