import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Venue } from '../data/venues'
import { supabase } from '../lib/supabase'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

function getColor(price: number): string {
  if (price < 60) return 'green'
  if (price < 89) return 'yellow'
  return 'red'
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [venues, setVenues] = useState<Venue[]>([])

  useEffect(() => {
    async function fetchVenues() {
      const { data, error } = await supabase.from('venues').select('*')

      if (error) {
        console.error(error)
        return
      }

      console.log('venues from supabase:', data)
      setVenues(data as Venue[])
    }

    fetchVenues()
  }, [])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [16.1826, 58.5877],
      zoom: 13,
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    venues.forEach((venue) => {
      const marker = new mapboxgl.Marker({ color: getColor(venue.price) })
        .setLngLat([venue.lng, venue.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<h3>${venue.name}</h3><p>${venue.price} kr</p>`
          )
        )
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [venues])

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
}