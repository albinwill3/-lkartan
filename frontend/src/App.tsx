import MapView from './components/MapView'
import AddVenuesForm from './components/AddVenues'
import { useState } from 'react'




function App() {
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number
    lng: number
  } | null>(null)
  return (
    <>

      <MapView setSelectedCoords = {setSelectedCoords} />
      <AddVenuesForm selectedCoords = {selectedCoords} />
      
    </>
  )
}

export default App