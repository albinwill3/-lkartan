import MapView from "./components/MapView"
import AddVenuesForm from "./components/AddVenues"
import AuthForm from "./components/AuthForm"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import type { Venue } from "./data/venues"
import type { Review } from "./data/reviews"
import type { Vote } from "./data/votes"
import type { User } from "@supabase/supabase-js"
import './App.css'
import FilterSheet from "./components/FilterSheet"
import ProfileSheet from "./components/ProfileSheet"
import { groupVenues } from "./utils/groupVenues"
import { isOpenNow } from "./utils/openingHours"

function App() {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [placingMode, setPlacingMode] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [guinnessFilter, setGuinnessFilter] = useState<"all" | "yes" | "no">("all")
  const [maxPricePerCl, setMaxPricePerCl] = useState(999)
  const [maxPricePerOl, setMaxPricePerOl] = useState(999)
  const [usePriceOlFilter, setUsePriceOlFilter] = useState(false)
  const [usePriceFilter, setUsePriceFilter] = useState(false)
  const [useRatingFilter, setUseRatingFilter] = useState(false)
  const [minRating, setMinRating] = useState(1)
  const [openNowFilter, setOpenNowFilter] = useState(false)

  async function fetchVenues() {
    const { data, error } = await supabase.from("venues").select("*")
    if (error) { console.error(error); return }
    setVenues(data as Venue[])
  }

  async function fetchReviews() {
    const { data, error } = await supabase.from("reviews").select("*")
    if (error) { console.error(error); return }
    setReviews(data as Review[])
  }

  async function fetchVotes() {
    const { data, error } = await supabase.from("votes").select("*")
    if (error) { console.error(error); return }
    setVotes(data as Vote[])
  }


  useEffect(() => {
    fetchVenues()
    fetchReviews()
    fetchVotes()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    const reviewChannel = supabase
      .channel("reviews-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        fetchReviews()
      })
      .subscribe()

    const venueChannel = supabase
      .channel("venues-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "venues" }, () => {
        fetchVenues()
      })
      .subscribe()

    const voteChannel = supabase
      .channel("votes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        fetchVotes()
      })
      .subscribe()

    return () => {
      listener.subscription.unsubscribe()
      supabase.removeChannel(reviewChannel)
      supabase.removeChannel(venueChannel)
      supabase.removeChannel(voteChannel)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function getAverageRatingForVenue(venue: Venue) {
    const venueReviews = reviews.filter((r) => r.venue_id === venue.id)
    const ratings = venueReviews.map((r) => r.rating)
    if (venue.rating && venue.rating > 0) ratings.push(venue.rating)
    if (ratings.length === 0) return null
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  }

  function closeSheets() {
    setShowProfile(false)
    setShowFilter(false)
  }

  function handlePlaceConfirmed(coords: { lat: number; lng: number }) {
    setSelectedCoords(coords)
    setPlacingMode(false)
    setShowAddForm(true)
    setShowProfile(false)
    setShowFilter(false)
  }

  function handleCancelPlace() {
    setPlacingMode(false)
  }

  const pricePerClValues = venues.filter((v) => v.volym > 0).map((v) => v.price / v.volym)
  const cheapestPricePerCl = pricePerClValues.length > 0 ? Math.min(...pricePerClValues) : 0
  const mostExpensivePricePerCl = pricePerClValues.length > 0 ? Math.max(...pricePerClValues) : 5

  const pricePerOlValues = venues.filter((v) => v.price > 0).map((v) => v.price)
  const cheapestPricePerOl = pricePerOlValues.length > 0 ? Math.min(...pricePerOlValues) : 0
  const mostExpensivePricePerOl = pricePerOlValues.length > 0 ? Math.max(...pricePerOlValues) : 200

  const filteredVenues = venues.filter((venue) => {
    const matchesGuinness =
      guinnessFilter === "all" ||
      (guinnessFilter === "yes" && venue.guinness) ||
      (guinnessFilter === "no" && !venue.guinness)

    let matchesOlPrice = true
    if (usePriceOlFilter) {
      if (!venue.price || venue.price <= 0) matchesOlPrice = false
      else matchesOlPrice = venue.price <= maxPricePerOl + 0.1
    }
    let matchesPrice = true
    if (usePriceFilter) {
      if (!venue.volym || venue.volym <= 0) matchesPrice = false
      else matchesPrice = venue.price / venue.volym <= maxPricePerCl + 0.1
    }

    let matchesRating = true
    if (useRatingFilter) {
      const avg = getAverageRatingForVenue(venue)
      matchesRating = avg !== null && avg >= minRating
    }

    let matchesOpenNow = true
    if (openNowFilter) {
      matchesOpenNow = isOpenNow(venue.opening_hours) === true
    }

    return matchesGuinness && matchesPrice && matchesRating && matchesOlPrice && matchesOpenNow
  })

  const venueGroups = groupVenues(filteredVenues)

  return (
    <div className="app-shell">
      <MapView
        venueGroups={venueGroups}
        votes={votes}
        reviews={reviews}
        setSelectedCoords={setSelectedCoords}
        user={user}
        onMapClick={closeSheets}
        placingMode={placingMode}
        onPlaceConfirmed={handlePlaceConfirmed}
        onCancelPlace={handleCancelPlace}
        onVoteChange={setVotes}
        onReviewAdded={fetchReviews}
        onVenuesChanged={fetchVenues}
      />

      <details className="map-legend">
        <summary className="map-legend-summary">
          <div className="legend-dots-row">
            <span className="legend-dot green" />
            <span className="legend-dot yellow" />
            <span className="legend-dot red" />
          </div>
          <span className="legend-expand-hint">Prisklasser</span>
        </summary>
        <div className="legend-items">
          <div className="legend-row"><span className="legend-dot green" />Billigt</div>
          <div className="legend-row"><span className="legend-dot yellow" />Medel</div>
          <div className="legend-row"><span className="legend-dot red" />Dyrt</div>
        </div>
      </details>

      <div className="top-bubble">
        <h1>Ölkartan</h1>
      </div>

      {showAddForm && (
        <div className="add-sheet">
          <AddVenuesForm
            selectedCoords={selectedCoords}
            onVenueAdded={fetchVenues}
            onClose={() => setShowAddForm(false)}
            userId={user?.id ?? null}
          />
        </div>
      )}

      {!placingMode && (
        <nav className="bottom-nav">
          <button onClick={() => {
            setShowProfile(!showProfile)
            setShowAddForm(false)
            setShowFilter(false)
          }}>Profil</button>

          <button onClick={() => {
            if (!user) {
              setShowProfile(true)
              setShowAddForm(false)
              setShowFilter(false)
              return
            }
            setShowAddForm(false)
            setShowProfile(false)
            setShowFilter(false)
            setPlacingMode(true)
          }}>Lägg till</button>

          <button onClick={() => {
            setShowProfile(false)
            setShowAddForm(false)
            setShowFilter(!showFilter)
          }}>Filtrera</button>
        </nav>
      )}

      {showProfile && (
        <div className="profile-sheet">
          <ProfileSheet
            user={user}
            venues={venues}
            reviews={reviews}
            votes={votes}
            onLogout={handleLogout}
            onVenuesChanged={fetchVenues}
          />
        </div>
      )}

      {showFilter && (
        <FilterSheet
          guinnessFilter={guinnessFilter}
          setGuinnessFilter={setGuinnessFilter}
          maxPricePerCl={maxPricePerCl}
          setMaxPricePerCl={setMaxPricePerCl}
          maxPricePerOl={maxPricePerOl}
          setMaxPricePerOl={setMaxPricePerOl}
          cheapestPricePerOl={cheapestPricePerOl}
          mostExpensivePricePerOl={mostExpensivePricePerOl}
          cheapestPricePerCl={cheapestPricePerCl}
          mostExpensivePricePerCl={mostExpensivePricePerCl}
          usePriceFilter={usePriceFilter}
          setUsePriceFilter={setUsePriceFilter}
          usePriceOlFilter={usePriceOlFilter}
          setUsePriceOlFilter={setUsePriceOlFilter}
          useRatingFilter={useRatingFilter}
          setUseRatingFilter={setUseRatingFilter}
          minRating={minRating}
          setMinRating={setMinRating}
          openNowFilter={openNowFilter}
          setOpenNowFilter={setOpenNowFilter}
        />
      )}
    </div>
  )
}

export default App
