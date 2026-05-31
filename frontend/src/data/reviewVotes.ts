export type ReviewVote = {
  id: string
  user_id: string
  review_id: number
  value: 1 | -1
  created_at: string
}
