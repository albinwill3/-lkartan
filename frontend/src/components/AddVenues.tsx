import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { initHoursGroups, buildOpeningHours } from "../utils/openingHours"
import type { HoursGroup } from "../utils/openingHours"
import OpeningHoursEditor from "./OpeningHoursEditor"
import RangeSlider from "./RangeSlider"
import TempSelector from "./TempSelector"

export default function AddVenueForm({ selectedCoords, onVenueAdded, onClose, userId }: {
  selectedCoords: { lat: number; lng: number } | null
  onVenueAdded: () => void
  onClose: () => void
  userId: string | null
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [volym, setVolym] = useState("")
  const [kannaPrice, setKannaPrice] = useState("")
  const [guinness, setGuinness] = useState(false)
  const [beerType, setBeerType] = useState("")
  const [temperature, setTemperature] = useState(2)
  const [rating, setRating] = useState(5)
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [showHours, setShowHours] = useState(false)
  const [hoursGroups, setHoursGroups] = useState<HoursGroup[]>(() => initHoursGroups(null))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (selectedCoords) {
      setLat(selectedCoords.lat.toString())
      setLng(selectedCoords.lng.toString())
    }
  }, [selectedCoords])

  function updateHoursGroup(i: number, patch: Partial<HoursGroup>) {
    setHoursGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const opening_hours = buildOpeningHours(hoursGroups)

    const venueData: Record<string, unknown> = {
      name,
      price: price ? Number(price) : null,
      volym: volym ? Number(volym) : null,
      kannaPrice: kannaPrice ? Number(kannaPrice) : null,
      lat: Number(lat),
      lng: Number(lng),
      guinness,
      beerType: beerType || null,
      temperature,
      rating,
      user_id: userId,
    }

    if (opening_hours !== null) {
      venueData.opening_hours = opening_hours
    }

    const { error: insertError } = await supabase.from("venues").insert([venueData]).select()

    setSubmitting(false)

    if (insertError) {
      console.error(insertError)
      setError(insertError.message)
      return
    }

    onVenueAdded()
    onClose()
  }

  return (
    <div className="add-venue-form">
      <h2>Lägg till bar</h2>

      {selectedCoords && (
        <p className="add-venue-coords">
          📍 {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          placeholder="Namn på baren"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="form-row">
          <input
            placeholder="Ölpris (kr)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            placeholder="Volym (cl)"
            type="number"
            value={volym}
            onChange={(e) => setVolym(e.target.value)}
          />
        </div>

        <input
          placeholder="Kannapris (kr)"
          type="number"
          value={kannaPrice}
          onChange={(e) => setKannaPrice(e.target.value)}
        />

        <input
          placeholder="Ölsort"
          value={beerType}
          onChange={(e) => setBeerType(e.target.value)}
        />

        <div className="filter-group">
          <label className="stat-label">Temperatur</label>
          <TempSelector value={temperature} onChange={setTemperature} />
        </div>

        <div className="filter-group">
          <label className="stat-label">Rating: {rating}/10</label>
          <RangeSlider min={1} max={10} step={1} value={rating} onChange={setRating} />
        </div>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={guinness}
            onChange={(e) => setGuinness(e.target.checked)}
          />
          <span className="custom-checkbox"></span>
          Guinness på tap
        </label>

        <div className="filter-group">
          <button
            type="button"
            className="hours-toggle-btn"
            onClick={() => setShowHours((v) => !v)}
          >
            <span>Öppettider (valfritt)</span>
            <span className={`expand-arrow ${showHours ? "open" : ""}`}>›</span>
          </button>
          {showHours && (
            <OpeningHoursEditor groups={hoursGroups} onChange={updateHoursGroup} />
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Sparar..." : "Spara"}
        </button>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>Avbryt</button>
      </form>
    </div>
  )
}
