import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { ReviewVote } from "../data/reviewVotes"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import ReviewModal from "./ReviewModal"
import VenueGroupPanel from "./VenueGroupPanel"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

function getColor(price: number, volym: number): string {
  const pricePerCl = price / volym
  if (pricePerCl < 1.5) return "#3fb64b"
  if (pricePerCl < 2.2) return "#e6c940"
  return "#e04040"
}

function groupColor(group: VenueGroup, votes: Vote[]): string {
  // Use the top-voted venue's price/cl for color; fall back to first
  const sorted = [...group.venues].sort((a, b) => {
    const netA = votes.filter((v) => v.venue_id === a.id).reduce((s, v) => s + v.value, 0)
    const netB = votes.filter((v) => v.venue_id === b.id).reduce((s, v) => s + v.value, 0)
    return netB - netA
  })
  const top = sorted[0]
  if (!top.price || !top.volym) return "#888"
  return getColor(top.price, top.volym)
}

export default function MapView({
  venueGroups,
  votes,
  reviews,
  reviewVotes,
  setSelectedCoords,
  user,
  onMapClick,
  placingMode,
  onPlaceConfirmed,
  onCancelPlace,
  onVoteChange,
  onReviewVoteChange,
}: {
  venueGroups: VenueGroup[]
  votes: Vote[]
  reviews: Review[]
  reviewVotes: ReviewVote[]
  setSelectedCoords: (coords: { lat: number; lng: number }) => void
  user: User | null
  onMapClick: () => void
  placingMode: boolean
  onPlaceConfirmed: (coords: { lat: number; lng: number }) => void
  onCancelPlace: () => void
  onVoteChange: (votes: Vote[]) => void
  onReviewVoteChange: (votes: ReviewVote[]) => void
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const tempMarkerRef = useRef<mapboxgl.Marker | null>(null)

  const [selectedGroup, setSelectedGroup] = useState<VenueGroup | null>(null)
  const [reviewVenueId, setReviewVenueId] = useState<number | null>(null)
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null)

  async function fetchReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) console.error(error)
  }

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
      map.remove()
      mapRef.current = null
    }
  }, [setSelectedCoords])

  // Placing mode cursor + cleanup
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (placingMode) {
      map.getCanvas().style.cursor = "crosshair"
      setSelectedGroup(null)
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

    function handlePlaceClick(e: mapboxgl.MapMouseEvent) {
      const target = e.originalEvent.target as HTMLElement
      if (target.closest(".mapboxgl-marker")) return

      const { lng, lat } = e.lngLat

      if (tempMarkerRef.current) { tempMarkerRef.current.remove(); tempMarkerRef.current = null }

      const el = document.createElement("div")
      el.style.cssText = `
        width: 18px; height: 18px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: #f5a623;
        border: 2px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
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
    if (!mapRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    venueGroups.forEach((group) => {
      const color = groupColor(group, votes)
      const count = group.venues.length

      const el = document.createElement("div")
      el.style.cssText = `
        width: ${count > 1 ? "20px" : "14px"};
        height: ${count > 1 ? "20px" : "14px"};
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.85);
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      `
      if (count > 1) el.textContent = String(count)

      el.addEventListener("click", (e) => {
        e.stopPropagation()
        if (placingMode) return
        setSelectedGroup(group)
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([group.lng, group.lat])
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [venueGroups, votes, placingMode])

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
          reviewVotes={reviewVotes}
          user={user}
          onClose={() => setSelectedGroup(null)}
          onVoteChange={onVoteChange}
          onReviewVoteChange={onReviewVoteChange}
          onAddReview={(venueId) => setReviewVenueId(venueId)}
        />
      )}

      {reviewVenueId !== null && user && (
        <ReviewModal
          venueId={reviewVenueId}
          user={user}
          onClose={() => setReviewVenueId(null)}
          onReviewAdded={fetchReviews}
        />
      )}
    </>
  )
}
