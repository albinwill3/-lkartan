import MapView from "./components/MapView"
import AddVenuesForm from "./components/AddVenues"
import AuthForm from "./components/AuthForm"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import type { Venue } from "./data/venues"
import type { User } from "@supabase/supabase-js"
import './App.css'

function App() {
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number
    lng: number
  } | null>(null)

  const [venues, setVenues] = useState<Venue[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  async function fetchVenues() {
    const { data, error } = await supabase.from("venues").select("*")

    if (error) {
      console.error(error)
      return
    }

    setVenues(data as Venue[])
  }

  useEffect(() => {
    fetchVenues()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (!user) {
    return <AuthForm />
  }
  function closeSheets() {
    setShowProfile(false)
    //setShowAddForm(false)
    setShowFilter(false)
  }

  return (
    <div className="app-shell">
      <MapView
        venues={venues}
        setSelectedCoords={setSelectedCoords}
        user={user}
        onMapClick={closeSheets}
      />

      <div className="top-bubble">
        <h1>Ölkartan</h1>
      </div>

      {showAddForm && (
        <div className="add-sheet">
          <AddVenuesForm
            selectedCoords={selectedCoords}
            onVenueAdded={fetchVenues}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      )}

      <nav className="bottom-nav">
        <button onClick={() => {
          setShowProfile(!showProfile)
          setShowAddForm(false)
          setShowFilter(false)
        }}>Profil
        </button>


        <button onClick={() => {
          setShowProfile(false)
          setShowAddForm(!showAddForm)
          setShowFilter(false)
        }}>
          Lägg till
        </button>

        <button onClick={() => {
          setShowProfile(false)
          setShowAddForm(false)
          setShowFilter(!showFilter)
        }}>Filtrera</button>
      </nav>
      {showProfile && (
        <div className="profile-sheet">
          <h2>Profil</h2>

          <p>{user?.email}</p>

          <button onClick={handleLogout}>Logga ut</button>

        </div>
      )}
      {showFilter && (
        <div className="filter-sheet">
          <h2>Filter</h2>

        </div>
      )}
    </div>
  )
}

export default App