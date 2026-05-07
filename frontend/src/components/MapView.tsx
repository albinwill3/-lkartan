import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Venue } from "../data/venues"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { getTempLabel } from "../utils/temperature"
import { getVajbLabel } from "../utils/vibe"
import ReviewModal from "./ReviewModal"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

function getColor(price: number): string {
  if (price < 60) return "green"
  if (price < 89) return "yellow"
  return "red"
}

export default function MapView({
  venues,
  setSelectedCoords,
  user,
  onMapClick
}: {
  venues: Venue[]
  setSelectedCoords: (coords: { lat: number; lng: number }) => void
  user: User | null
  onMapClick: () => void
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewVenueId, setReviewVenueId] = useState<number | null>(null)

  async function fetchReviews() {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setReviews(data as Review[])
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [16.1826, 58.5877],
      zoom: 13,
    })

    map.on("click", (e) => {
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

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    venues.forEach((venue) => {
      const venueReviews = reviews.filter((review) => review.venue_id === venue.id)

      const reviewsHtml =
        venueReviews.length > 0
          ? venueReviews
            .map(
              (review) => `
                  <div class="popup-review">
                    <strong>${review.rating}/5</strong>
                    <p>${review.text || ""}</p>
                  </div>
                `
            )
            .join("")
          : `<p>Inga recensioner ännu.</p>`

      const popupHtml = `
        <div class="venue-popup">
          <h3>${venue.name}</h3>
          <p>${venue.price} kr</p>
          <p>Ölsort: ${venue.beerType}</p>
          <p>Temperatur: ${getTempLabel(venue.temperature)}</p>
          <p>Vajb: ${getVajbLabel(venue.vajb)}</p>
          <p>Guinness: ${venue.guinness ? "Ja" : "Nej"}</p>

          ${user
          ? `<button class="add-review-button" data-venue-id="${venue.id}">
                  Lägg till recension
                </button>`
          : `<p>Logga in för att lägga till recension.</p>`
        }

          <details class="reviews-dropdown">
            <summary>Recensioner</summary>
            ${reviewsHtml}
          </details>
        </div>
      `

      const popup = new mapboxgl.Popup().setHTML(popupHtml)

      popup.on("open", () => {
        const button = document.querySelector(
          `.add-review-button[data-venue-id="${venue.id}"]`
        )

        button?.addEventListener("click", () => {
          setReviewVenueId(venue.id)
        })
      })

      const marker = new mapboxgl.Marker({ color: getColor(venue.price) })
        .setLngLat([venue.lng, venue.lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [venues, reviews, user])

  return (
    <>
      <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />

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