export type DayHours = { open: string; close: string }
export type OpeningHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>>

export type Venue = {
  id: number
  name: string
  price: number
  volym: number
  kannaPrice: number
  lat: number
  lng: number
  guinness: boolean
  beerType: string
  temperature: number
  rating: number
  user_id: string | null
  opening_hours: OpeningHours | null
}

