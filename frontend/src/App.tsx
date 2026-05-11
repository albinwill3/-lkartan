import MapView from "./components/MapView"
import AddVenuesForm from "./components/AddVenues"
import AuthForm from "./components/AuthForm"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import type { Venue } from "./data/venues"
import type { User } from "@supabase/supabase-js"
import './App.css'
import FilterSheet from "./components/FilterSheet"

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
  const [guinnessFilter, setGuinnessFilter] = useState<"all" | "yes" | "no">("all")
  const [maxPricePerCl, setMaxPricePerCl] = useState(999)
  const [usePriceFilter, setUsePriceFilter] = useState(false)

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

  // if (!user) {
  //   return <AuthForm />
  // }
  function closeSheets() {
    setShowProfile(false)
    //setShowAddForm(false)
    setShowFilter(false)
  }
  const pricePerClValues = venues
    .filter((venue) => venue.volym > 0)
    .map((venue) => venue.price / venue.volym)

  const cheapestPricePerCl =
    pricePerClValues.length > 0 ? Math.min(...pricePerClValues) : 0

  const mostExpensivePricePerCl =
    pricePerClValues.length > 0 ? Math.max(...pricePerClValues) : 5


  const filteredVenues = venues.filter((venue) => {
    const matchesGuinness =
      guinnessFilter === "all" ||
      (guinnessFilter === "yes" && venue.guinness) ||
      (guinnessFilter === "no" && !venue.guinness)

    let matchesPrice = true

    if (usePriceFilter) {
      if (!venue.volym || venue.volym <= 0) {
        matchesPrice = false
      } else {
        const pricePerCl = venue.price / venue.volym
        matchesPrice = pricePerCl <= maxPricePerCl + 0.1
      }
    }

    return matchesGuinness && matchesPrice
  })

  return (
    <div className="app-shell">
      <MapView
        venues={filteredVenues}
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
          if (!user) {
            setShowProfile(!showProfile)
            setShowAddForm(false)
            setShowFilter(false)
            return
          }

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
          {user ? (
            <>
              <h2>Profil</h2>
              <p>{user.email}</p>
              <button onClick={handleLogout}>Logga ut</button>
            </>
          ) : (
            <>
              <h2>Logga in</h2>
              <AuthForm />
            </>
          )}
        </div>
      )}
      {showFilter && (
        <FilterSheet
          guinnessFilter={guinnessFilter}
          setGuinnessFilter={setGuinnessFilter}
          maxPricePerCl={maxPricePerCl}
          setMaxPricePerCl={setMaxPricePerCl}
          cheapestPricePerCl={cheapestPricePerCl}
          mostExpensivePricePerCl={mostExpensivePricePerCl}
          usePriceFilter={usePriceFilter}
          setUsePriceFilter={setUsePriceFilter}
        />
      )}
    </div>
  )
}

export default App