import {useEffect, useState} from "react"
import { supabase } from "../lib/supabase";
import {getTempLabel} from "../utils/temperature"

export default function AddVenueForm({selectedCoords, onVenueAdded,}: {
    selectedCoords: { lat: number; lng: number } | null
    onVenueAdded: () => void
}) {
    const [name, setName] = useState("")
    const [price, setPrice] = useState("")
    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const [guinness, setGuinness] = useState(false)
    const [beerType, setBeerType] = useState("")
    const [temperature, setTemperature] = useState(2)
    const [isOpen, setIsOpen] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        
        const newVenue = {
            name,
            price: Number(price),
            lat: Number(lat),
            lng: Number(lng),
            guinness,
            beerType,
            temperature,
        }

        const {error} = await supabase.from("venues").insert([newVenue]).select()

        if(!error){
            onVenueAdded()
        }
        setName("")
        setPrice("")
        setLat("")
        setLng("")
        setGuinness(false)
        setBeerType("")
        setTemperature(2)
    }
    useEffect(() => {
        if(selectedCoords){
            setLat(selectedCoords.lat.toString())
            setLng(selectedCoords.lng.toString())
        }
    }, [selectedCoords])

    return(
        <div className="add-venue-panel">
            <button type="button" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Stäng" : "Lägg till bar"}
            </button>
            {isOpen && (
        <form onSubmit={handleSubmit}>
            <input
            placeholder = "Namn"
            value = {name}
            onChange={(e) => setName(e.target.value)}
            />

            <input
            placeholder="Pris"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            />

            <input
            placeholder="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            />

            <input
            placeholder="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            />

            <input
            placeholder = "Ölsort"
            value = {beerType}
            onChange={(e) => setBeerType(e.target.value)}
            />
            <div className="temperature-field">
              <span className="temperature-label">
                Temperatur: {getTempLabel(temperature)}
            </span>
            <input
            type="range"
            min="1"
            max="4"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            />
            </div>

            <label>
                <span>Finns Guinness på tap?</span>
                 <input
                    type = "checkbox"
                    checked = {guinness}
                    onChange = {(e) => setGuinness(e.target.checked)}
                 />
            </label>



            <button type="submit">Lägg till</button>
        </form>
        )}
        </div>
    )
}