import type { OpeningHours } from "../data/venues"

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

export function isOpenNow(hours: OpeningHours | null | undefined): boolean | null {
  if (!hours || Object.keys(hours).length === 0) return null
  const now = new Date()
  const day = DAY_NAMES[now.getDay()]
  const todayHours = hours[day]
  if (!todayHours) return false

  const [openH, openM] = todayHours.open.split(":").map(Number)
  const [closeH, closeM] = todayHours.close.split(":").map(Number)
  const currentMin = now.getHours() * 60 + now.getMinutes()
  const openMin = openH * 60 + openM
  const closeMin = closeH * 60 + closeM

  if (closeMin <= openMin) {
    return currentMin >= openMin || currentMin < closeMin
  }
  return currentMin >= openMin && currentMin < closeMin
}

export type HoursGroup = {
  label: string
  days: string[]
  open: string
  close: string
  closed: boolean
}

export function initHoursGroups(oh: OpeningHours | null | undefined): HoursGroup[] {
  const monH = oh?.mon ?? oh?.tue ?? oh?.wed ?? oh?.thu
  return [
    { label: "Mån–Tor", days: ["mon", "tue", "wed", "thu"], open: monH?.open ?? "16:00", close: monH?.close ?? "01:00", closed: !monH },
    { label: "Fre",     days: ["fri"],                      open: oh?.fri?.open ?? "16:00", close: oh?.fri?.close ?? "03:00", closed: !oh?.fri },
    { label: "Lör",     days: ["sat"],                      open: oh?.sat?.open ?? "14:00", close: oh?.sat?.close ?? "03:00", closed: !oh?.sat },
    { label: "Sön",     days: ["sun"],                      open: oh?.sun?.open ?? "14:00", close: oh?.sun?.close ?? "00:00", closed: oh?.sun === undefined },
  ]
}

export function buildOpeningHours(groups: HoursGroup[]): OpeningHours | null {
  const result: OpeningHours = {}
  for (const group of groups) {
    if (!group.closed) {
      for (const day of group.days) {
        ;(result as Record<string, { open: string; close: string }>)[day] = { open: group.open, close: group.close }
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null
}
