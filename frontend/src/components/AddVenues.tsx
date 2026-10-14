import { useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import { initHoursGroups, buildOpeningHours } from "../utils/openingHours"
import type { HoursGroup } from "../utils/openingHours"
import OpeningHoursEditor from "./OpeningHoursEditor"
import RangeSlider from "./RangeSlider"
import TempSelector from "./TempSelector"
import type { Venue } from "../data/venues"
import type { Report } from "../data/reports"

export default function AddVenueForm({ selectedCoords, venue, reportToEdit, onVenueAdded, onClose, userId }: {
  selectedCoords: { lat: number; lng: number } | null
  venue: Venue | null
  reportToEdit?: Report | null
  onVenueAdded: () => void
  onClose: () => void
  userId: string | null
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState(String(reportToEdit?.price ?? ""))
  const [volym, setVolym] = useState(String(reportToEdit?.volym ?? ""))
  const [kannaPrice, setKannaPrice] = useState(String(reportToEdit?.kannaPrice ?? ""))
  const [guinness, setGuinness] = useState(reportToEdit?.guinness ?? false)
  const [beerType, setBeerType] = useState(reportToEdit?.beerType ?? "")
  const [temperature, setTemperature] = useState(reportToEdit?.temperature ?? 2)
  const [rating, setRating] = useState(reportToEdit?.rating ?? 5)
  const [saving, setSaving] = useState(false)
  const saveInFlight = useRef(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showHours, setShowHours] = useState(false)
  const [hoursGroups, setHoursGroups] = useState<HoursGroup[]>(initHoursGroups(reportToEdit?.opening_hours))
  const [hoursChanged, setHoursChanged] = useState(false)

  function updateHoursGroup(i: number, patch: Partial<HoursGroup>) {
    setHoursChanged(true)
    setHoursGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saveInFlight.current) return
    setErrorMessage("")
    if (reportToEdit && reportToEdit.user_id !== userId) {
      setErrorMessage("Du kan bara ändra dina egna rapporter.")
      return
    }
    if (!userId || (!venue && (!selectedCoords || !name.trim()))) {
      setErrorMessage("Logga in och välj en bar eller ange namn och plats.")
      return
    }
    if (!price || !volym || !Number.isFinite(Number(price)) || !Number.isFinite(Number(volym)) || Number(price) <= 0 || Number(volym) <= 0) {
      setErrorMessage("Pris och volym måste vara större än noll.")
      return
    }
    if (!Number.isFinite(Number(kannaPrice)) || Number(kannaPrice) < 0) {
      setErrorMessage("Kannapris måste vara noll eller större.")
      return
    }

    const report = {
      price: Number(price),
      volym: Number(volym),
      kannaPrice: Number(kannaPrice),
      guinness,
      beerType,
      temperature,
      rating,
      user_id: userId,
      opening_hours: reportToEdit && !hoursChanged ? reportToEdit.opening_hours ?? null : buildOpeningHours(hoursGroups),
    }
    saveInFlight.current = true
    setSaving(true)
    try {
      const { error } = reportToEdit
        ? await supabase.from("reports").update(report)
          .eq("id", reportToEdit.id).eq("user_id", userId).select("id").single()
        : venue
        ? await supabase.from("reports").insert({ ...report, venue_id: venue.id })
        : await supabase.rpc("create_venue_with_report", {
          venue_name: name.trim(),
          venue_lat: selectedCoords!.lat,
          venue_lng: selectedCoords!.lng,
          report_data: report,
        })
      if (error) {
        setErrorMessage(error.message)
        return
      }
      onVenueAdded()
      onClose()
    } catch {
      setErrorMessage("Kunde inte spara. Försök igen.")
    } finally {
      saveInFlight.current = false
      setSaving(false)
    }
  }

  return (
    <div className="add-venue-form">
      <h2>{reportToEdit ? `Ändra rapport: ${venue?.name ?? ""}` : venue ? `Nytt pris: ${venue.name}` : "Lägg till bar"}</h2>

      {selectedCoords && (
        <p className="add-venue-coords">
          📍 {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {!venue && <input
          placeholder="Namn på baren"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />}

        <div className="form-row">
          <input
            placeholder="Ölpris (kr)"
            type="number"
            min="0.01"
            step="any"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <input
            placeholder="Volym (cl)"
            type="number"
            min="0.01"
            step="any"
            required
            value={volym}
            onChange={(e) => setVolym(e.target.value)}
          />
        </div>

        <input
          placeholder="Kannapris (kr)"
          type="number"
          min="0"
          step="any"
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
          <button type="button" className="hours-toggle-btn" onClick={() => setShowHours((value) => !value)}>
            <span>Öppettider</span>
            <span className={`expand-arrow ${showHours ? "open" : ""}`}>›</span>
          </button>
          {showHours && <OpeningHoursEditor groups={hoursGroups} onChange={updateHoursGroup} />}
        </div>
        {errorMessage && <p role="alert" className="message error">{errorMessage}</p>}
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Sparar..." : reportToEdit ? "Spara ändringar" : "Spara"}</button>
        <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Avbryt</button>
      </form>
    </div>
  )
}
