export type DayHours = { open: string; close: string }
export type OpeningHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>>

export type Venue = {
  id: number
  name: string
  lat: number
  lng: number
  user_id: string | null
}

