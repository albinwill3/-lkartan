import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { getTempLabel } from "../utils/temperature"

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

  useEffect(() => {
    if (selectedCoords) {
      setLat(selectedCoords.lat.toString())
      setLng(selectedCoords.lng.toString())
    }
  }, [selectedCoords])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const { error } = await supabase.from("venues").insert([{
      name,
      price: Number(price),
      volym: Number(volym),
      kannaPrice: Number(kannaPrice),
      lat: Number(lat),
      lng: Number(lng),
      guinness,
      beerType,
      temperature,
      rating,
      user_id: userId,
    }]).select()

    if (error) {
      console.error(error)
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
          <label className="stat-label">Temperatur: {getTempLabel(temperature)}</label>
          <input
            type="range"
            min="1"
            max="4"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="stat-label">Rating: {rating}/10</label>
          <input
            type="range"
            min="1"
            max="10"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
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

        <button type="submit" className="btn-primary">Spara</button>
        <button type="button" className="btn-ghost" onClick={onClose}>Avbryt</button>
      </form>
    </div>
  )
}
