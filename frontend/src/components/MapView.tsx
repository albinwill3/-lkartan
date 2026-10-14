import { useEffect, useMemo, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import ReviewModal from "./ReviewModal"
import VenueGroupPanel from "./VenueGroupPanel"
import type { Report } from "../data/reports"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

function getColor(price: number, volym: number): string {
  const pricePerCl = price / volym
  if (pricePerCl < 1.5) return "#3fb64b"
  if (pricePerCl < 2.2) return "#e6c940"
  return "#e04040"
}

function groupColor(group: VenueGroup, voteTotals: Map<number, number>): string {
  // Use the top-voted report's price/cl for the marker color.
  let top: Report | undefined
  for (const report of group.reports) {
    if (!top || (voteTotals.get(report.id) ?? 0) > (voteTotals.get(top.id) ?? 0)) top = report
  }
  if (!top?.price || !top.volym) return "#888"
  return getColor(top.price, top.volym)
}

export default function MapView({
  venueGroups,
  votes,
  reviews,
  setSelectedCoords,
  user,
  onMapClick,
  placingMode,
  onPlaceConfirmed,
  onCancelPlace,
  onVoteChange,
  onReviewAdded,
  onAddReport,
  onEditReport,
  onReportDeleted,
}: {
  venueGroups: VenueGroup[]
  votes: Vote[]
  reviews: Review[]
  setSelectedCoords: (coords: { lat: number; lng: number }) => void
  user: User | null
  onMapClick: () => void
  placingMode: boolean
  onPlaceConfirmed: (coords: { lat: number; lng: number }) => void
  onCancelPlace: () => void
  onVoteChange: (votes: Vote[]) => void
  onReviewAdded: () => void
  onAddReport: (venueId: number) => void
  onEditReport: (report: Report) => void
  onReportDeleted: (reportId: number) => void
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef(new Map<string, mapboxgl.Marker>())
  const tempMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const placingModeRef = useRef(placingMode)
  const voteTotals = useMemo(() => {
    const totals = new Map<number, number>()
    for (const vote of votes) totals.set(vote.report_id, (totals.get(vote.report_id) ?? 0) + vote.value)
    return totals
  }, [votes])

  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const selectedGroup = venueGroups.find((group) => group.key === selectedGroupKey) ?? null
  const [reviewReportId, setReviewReportId] = useState<number | null>(null)
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null)


  // Map init
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [16.1826, 58.5877],
      zoom: 13,
    })

    map.on("click", (e) => {
      const target = e.originalEvent.target as HTMLElement
      if (target.closest(".mapboxgl-marker")) return
      const { lng, lat } = e.lngLat
      setSelectedCoords({ lat, lng })
      onMapClick()
    })

    mapRef.current = map

    return () => {
      markersRef.current.clear()
      map.remove()
      mapRef.current = null
    }
  }, [setSelectedCoords])

  // Placing mode cursor + cleanup
  useEffect(() => {
    placingModeRef.current = placingMode
    const map = mapRef.current
    if (!map) return

    if (placingMode) {
      map.getCanvas().style.cursor = "crosshair"
      setSelectedGroupKey(null)
      setPendingCoords(null)
      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }
    } else {
      map.getCanvas().style.cursor = ""
      setPendingCoords(null)
      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }
    }
  }, [placingMode])

  // Click-to-place listener
  useEffect(() => {
    const map = mapRef.current
    if (!map || !placingMode) return

    const handlePlaceClick = (e: mapboxgl.MapMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement
      if (target.closest(".mapboxgl-marker")) return

      const { lng, lat } = e.lngLat

      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }

      const el = document.createElement("div")
      el.style.cssText = `
        width: 28px; height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: #f5a623;
        border: 3px solid #fff;
        box-shadow: 0 0 0 2px rgba(15,15,21,0.75), 0 3px 10px rgba(0,0,0,0.5);
      `
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map)

      tempMarkerRef.current = marker
      setPendingCoords({ lat, lng })
    }

    map.on("click", handlePlaceClick)
    return () => { map.off("click", handlePlaceClick) }
  }, [placingMode])

  // Render group markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visibleKeys = new Set(venueGroups.map((group) => group.key))
    for (const [key, marker] of markersRef.current) {
      if (!visibleKeys.has(key)) {
        marker.remove()
        markersRef.current.delete(key)
      }
    }

    venueGroups.forEach((group) => {
      const color = groupColor(group, voteTotals)
      const count = group.reports.length
      const existing = markersRef.current.get(group.key)
      if (existing) {
        const el = existing.getElement()
        if (el.dataset.color !== color) {
          el.style.background = color
          el.dataset.color = color
        }
        if (el.dataset.count !== String(count)) {
          el.style.width = count > 1 ? "34px" : "28px"
          el.style.height = el.style.width
          el.textContent = count > 1 ? String(count) : ""
          el.dataset.count = String(count)
        }
        const position = existing.getLngLat()
        if (position.lng !== group.lng || position.lat !== group.lat) existing.setLngLat([group.lng, group.lat])
        return
      }

      const el = document.createElement("div")
      el.dataset.color = color
      el.dataset.count = String(count)
      el.style.cssText = `
        width: ${count > 1 ? "34px" : "28px"};
        height: ${count > 1 ? "34px" : "28px"};
        border-radius: 50%;
        background: ${color};
        border: 3px solid #fff;
        cursor: pointer;
        box-shadow: 0 0 0 2px rgba(15,15,21,0.75), 0 3px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
        color: #0f0f15;
        text-shadow: 0 1px 1px rgba(255,255,255,0.6);
      `
      if (count > 1) el.textContent = String(count)

      el.addEventListener("click", (e) => {
        e.stopPropagation()
        if (placingModeRef.current) return
        setSelectedGroupKey(group.key)
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([group.lng, group.lat])
        .addTo(map)

      markersRef.current.set(group.key, marker)
    })
  }, [venueGroups, voteTotals])

  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />

      {/* Placing mode banner */}
      {placingMode && (
        <div className="placing-banner">
          {pendingCoords ? (
            <>
              <span>Placera baren här?</span>
              <div className="placing-actions">
                <button className="placing-confirm" onClick={() => onPlaceConfirmed(pendingCoords)}>
                  Bekräfta
                </button>
                <button className="placing-cancel" onClick={() => {
                  if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }
                  setPendingCoords(null)
                }}>
                  Flytta
                </button>
                <button className="placing-cancel" onClick={() => {
                  if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }
                  onCancelPlace()
                }}>
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <>
              <span>Tryck på kartan för att placera baren</span>
              <button className="placing-cancel" onClick={onCancelPlace}>Avbryt</button>
            </>
          )}
        </div>
      )}

      {/* Venue group panel */}
      {selectedGroup && !placingMode && (
        <VenueGroupPanel
          group={selectedGroup}
          votes={votes}
          reviews={reviews}
          user={user}
          onClose={() => setSelectedGroupKey(null)}
          onVoteChange={onVoteChange}
          onAddReview={setReviewReportId}
          onEditReport={(report) => {
            onEditReport(report)
            setSelectedGroupKey(null)
          }}
          onReportDeleted={onReportDeleted}
          onAddReport={() => {
            onAddReport(selectedGroup.id)
            setSelectedGroupKey(null)
          }}
        />
      )}

      {reviewReportId !== null && user && (
        <ReviewModal
          reportId={reviewReportId}
          user={user}
          onClose={() => setReviewReportId(null)}
          onReviewAdded={onReviewAdded}
        />
      )}
    </>
  )
}
