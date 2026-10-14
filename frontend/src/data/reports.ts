import type { OpeningHours } from "./venues"

export type Report = {
  id: number
  venue_id: number
  price: number
  volym: number
  kannaPrice: number
  guinness: boolean
  beerType: string
  temperature: number
  rating: number
  user_id: string | null
  created_at: string | null
  opening_hours?: OpeningHours | null
}
