import { useEffect, useRef, useState, type SetStateAction } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { Venue } from '../data/venues'
import { supabase } from '../lib/supabase'
import {getTempLabel} from "../utils/temperature"

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN as string

//Color the pins based on price
function getColor(price: number): string {
  if (price < 60) return 'green'
  if (price < 89) return 'yellow'
  return 'red'
}

export default function MapView({venues, setSelectedCoords}: {
  venues: Venue[]
  setSelectedCoords: (coords: {lat: number, lng: number}) => void 
  
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  
  
  //create the map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [16.1826, 58.5877],
      zoom: 13,
    })
    
    map.on("click", (e) => {
      const {lng, lat} = e.lngLat
      console.log("clicked", lat, lng)
      setSelectedCoords({lat, lng})
    })


    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }

  }, [])



  //place all the pins on the map
  useEffect(() => {
    if (!mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    venues.forEach((venue) => {
      const marker = new mapboxgl.Marker({ color: getColor(venue.price) })
        .setLngLat([venue.lng, venue.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<h3>${venue.name}</h3>
            <p>${venue.price} kr</p>
            <p>Ölsort: ${venue.beerType} </p>
            <p>Temperatur: ${getTempLabel(venue.temperature)}<p/>
            <p>Guinness: ${venue.guinness ? "Ja": "Nej"}</p>`
          )
        )
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [venues])

  return <div ref={mapContainer} style={{ width: '100%', height: '80vh' }} />
}