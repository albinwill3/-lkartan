import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import ReviewModal from "./ReviewModal"
import VenueGroupPanel from "./VenueGroupPanel"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

const SOURCE_ID = "venues"
const GLOW_LAYER = "venue-glow"
const CIRCLES_LAYER = "venue-circles"
const COUNTS_LAYER = "venue-counts"

function getColor(price: number, volym: number): string {
  const ppc = price / volym
  if (ppc < 1.5) return "#3fb64b"
  if (ppc < 2.2) return "#e6c940"
  return "#e04040"
}

function groupColor(group: VenueGroup, votes: Vote[]): string {
  const sorted = [...group.venues].sort((a, b) => {
    const netA = votes.filter((v) => v.venue_id === a.id).reduce((s, v) => s + v.value, 0)
    const netB = votes.filter((v) => v.venue_id === b.id).reduce((s, v) => s + v.value, 0)
    return netB - netA
  })
  const top = sorted[0]
  if (!top.price || !top.volym) return "#888"
  return getColor(top.price, top.volym)
}

function buildGeoJSON(groups: VenueGroup[], votes: Vote[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: groups.map((group) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [group.lng, group.lat] },
      properties: {
        name: group.name,
        color: groupColor(group, votes),
        count: group.venues.length,
        lat: group.lat,
        lng: group.lng,
      },
    })),
  }
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
  onVenuesChanged,
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
  onVenuesChanged: () => void
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const tempMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Refs to avoid stale closures in map event handlers
  const groupsRef = useRef(venueGroups)
  const votesRef = useRef(votes)
  const placingModeRef = useRef(placingMode)
  const setSelectedCoordsRef = useRef(setSelectedCoords)
  const onMapClickRef = useRef(onMapClick)

  groupsRef.current = venueGroups
  votesRef.current = votes
  placingModeRef.current = placingMode
  setSelectedCoordsRef.current = setSelectedCoords
  onMapClickRef.current = onMapClick

  const [selectedGroup, setSelectedGroup] = useState<VenueGroup | null>(null)
  const [reviewVenueId, setReviewVenueId] = useState<number | null>(null)
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Map init — runs once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [16.1826, 58.5877],
      zoom: 13,
    })

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: buildGeoJSON(groupsRef.current, votesRef.current),
      })

      // Glow halo behind circles
      map.addLayer({
        id: GLOW_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", [">", ["get", "count"], 1], 22, 15],
          "circle-color": ["get", "color"],
          "circle-blur": 0.9,
          "circle-opacity": 0.35,
        },
      })

      // Main venue circles
      map.addLayer({
        id: CIRCLES_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["case", [">", ["get", "count"], 1], 16, 11],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "rgba(255,255,255,0.9)",
        },
      })

      // Count badge for grouped venues
      map.addLayer({
        id: COUNTS_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: [">", ["get", "count"], 1],
        layout: {
          "text-field": ["to-string", ["get", "count"]],
          "text-size": 11,
          "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.5)",
          "text-halo-width": 1,
        },
      })

      // Pointer cursor on hover
      map.on("mouseenter", CIRCLES_LAYER, () => {
        if (!placingModeRef.current) map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", CIRCLES_LAYER, () => {
        if (!placingModeRef.current) map.getCanvas().style.cursor = ""
      })

      // Click on a venue circle
      map.on("click", CIRCLES_LAYER, (e) => {
        if (placingModeRef.current) return
        const props = e.features?.[0]?.properties
        if (!props) return
        const group = groupsRef.current.find(
          (g) => g.lat === props.lat && g.lng === props.lng
        )
        if (group) setSelectedGroup(group)
        e.originalEvent.stopPropagation()
      })

      // Click on empty map
      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: [CIRCLES_LAYER] })
        if (hits.length > 0) return
        const { lng, lat } = e.lngLat
        setSelectedCoordsRef.current({ lat, lng })
        onMapClickRef.current()
      })

      setMapReady(true)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update source data when venues/votes change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const src = mapRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    src?.setData(buildGeoJSON(venueGroups, votes))
  }, [venueGroups, votes, mapReady])

  // Placing mode: cursor + cleanup
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

  // Placing mode click-to-place temp marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || !placingMode) return

    function handlePlaceClick(e: mapboxgl.MapMouseEvent) {
      const hits = map!.queryRenderedFeatures(e.point, { layers: [CIRCLES_LAYER] })
      if (hits.length > 0) return

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
      tempMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map!)

      setPendingCoords({ lat, lng })
    }

    map.on("click", handlePlaceClick)
    return () => { map.off("click", handlePlaceClick) }
  }, [placingMode])

  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />

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

      {selectedGroup && !placingMode && (
        <VenueGroupPanel
          group={selectedGroup}
          votes={votes}
          reviews={reviews}
          user={user}
          onClose={() => setSelectedGroup(null)}
          onVoteChange={onVoteChange}
          onAddReview={(venueId) => setReviewVenueId(venueId)}
          onVenuesChanged={() => { setSelectedGroup(null); onVenuesChanged() }}
        />
      )}

      {reviewVenueId !== null && user && (
        <ReviewModal
          venueId={reviewVenueId}
          user={user}
          onClose={() => setReviewVenueId(null)}
          onReviewAdded={onReviewAdded}
        />
      )}
    </>
  )
}
