import MapView from './components/MapView'
import AddVenuesForm from './components/AddVenues'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Venue } from './data/venues'



function App() {
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const [venues, setVenues] = useState<Venue[]>([])

  async function fetchVenues() {
    const { data, error } = await supabase.from('venues').select('*')

    if (error) {
      console.error(error)
      return
    }

    setVenues(data as Venue[])
  }
    useEffect(() => {
    fetchVenues()
  }, [])

  return (
    <>
      <div>
        Öpk kartan
      </div>
      <MapView 
      venues = {venues}
      setSelectedCoords = {setSelectedCoords} 
      />

      <AddVenuesForm 
      selectedCoords = {selectedCoords} 
      onVenueAdded={fetchVenues}
      />
      
    </>
  )
}

export default App