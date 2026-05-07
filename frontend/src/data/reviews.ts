export type Review = {
    id: number
    venue_id: number
    user_id: string
    rating: number
    text: string | null
    created_at: string
}