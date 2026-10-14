export type Vote = {
  id: string
  user_id: string
  report_id: number
  value: 1 | -1
  created_at: string
}
