import MapView from "./components/MapView"
import AddVenuesForm from "./components/AddVenues"
import AuthForm from "./components/AuthForm"
import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import type { Venue } from "./data/venues"
import type { Review } from "./data/reviews"
import type { Vote } from "./data/votes"
import type { ReviewVote } from "./data/reviewVotes"
import type { User } from "@supabase/supabase-js"
import './App.css'
import FilterSheet from "./components/FilterSheet"
import { groupVenues } from "./utils/groupVenues"

function App() {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [reviewVotes, setReviewVotes] = useState<ReviewVote[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [placingMode, setPlacingMode] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [guinnessFilter, setGuinnessFilter] = useState<"all" | "yes" | "no">("all")
  const [maxPricePerCl, setMaxPricePerCl] = useState(999)
  const [usePriceFilter, setUsePriceFilter] = useState(false)
  const [useRatingFilter, setUseRatingFilter] = useState(false)
  const [minRating, setMinRating] = useState(1)

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

  async function fetchReviewVotes() {
    const { data, error } = await supabase.from("review_votes").select("*")
    if (error) { console.error(error); return }
    setReviewVotes(data as ReviewVote[])
  }

  useEffect(() => {
    fetchVenues()
    fetchReviews()
    fetchVotes()
    fetchReviewVotes()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => { listener.subscription.unsubscribe() }
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

  const filteredVenues = venues.filter((venue) => {
    const matchesGuinness =
      guinnessFilter === "all" ||
      (guinnessFilter === "yes" && venue.guinness) ||
      (guinnessFilter === "no" && !venue.guinness)

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

    return matchesGuinness && matchesPrice && matchesRating
  })

  const venueGroups = groupVenues(filteredVenues)

  return (
    <div className="app-shell">
      <MapView
        venueGroups={venueGroups}
        votes={votes}
        reviews={reviews}
        reviewVotes={reviewVotes}
        setSelectedCoords={setSelectedCoords}
        user={user}
        onMapClick={closeSheets}
        placingMode={placingMode}
        onPlaceConfirmed={handlePlaceConfirmed}
        onCancelPlace={handleCancelPlace}
        onVoteChange={setVotes}
        onReviewVoteChange={setReviewVotes}
      />

      <div className="map-legend">
        <span className="legend-title">Pris per cl</span>
        <div className="legend-row"><span className="legend-dot green" />Billigt (&lt;1,5 kr)</div>
        <div className="legend-row"><span className="legend-dot yellow" />Medel (1,5–2,2 kr)</div>
        <div className="legend-row"><span className="legend-dot red" />Dyrt (&gt;2,2 kr)</div>
      </div>

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
          {user ? (
            <>
              <h2>Profil</h2>
              <p className="profile-email">{user.email}</p>

              {/* Vote summary */}
              {(() => {
                const myVenueIds = new Set(venues.filter((v) => v.user_id === user.id).map((v) => v.id))
                const myReviewIds = new Set(reviews.filter((r) => r.user_id === user.id).map((r) => r.id))

                const venueUpvotes   = votes.filter((v) => myVenueIds.has(v.venue_id) && v.value === 1).length
                const venueDownvotes = votes.filter((v) => myVenueIds.has(v.venue_id) && v.value === -1).length
                const reviewUpvotes   = reviewVotes.filter((v) => myReviewIds.has(v.review_id) && v.value === 1).length
                const reviewDownvotes = reviewVotes.filter((v) => myReviewIds.has(v.review_id) && v.value === -1).length

                const totalUp   = venueUpvotes + reviewUpvotes
                const totalDown = venueDownvotes + reviewDownvotes

                return (
                  <div className="profile-vote-summary">
                    <div className="profile-vote-stat up">
                      <span className="vote-summary-icon">▲</span>
                      <span className="vote-summary-count">{totalUp}</span>
                      <span className="vote-summary-label">uppröster</span>
                    </div>
                    <div className="profile-vote-divider" />
                    <div className="profile-vote-stat down">
                      <span className="vote-summary-icon">▼</span>
                      <span className="vote-summary-count">{totalDown}</span>
                      <span className="vote-summary-label">nerröster</span>
                    </div>
                  </div>
                )
              })()}

              {/* Added venues */}
              {(() => {
                const myVenues = venues.filter((v) => v.user_id === user.id)
                return (
                  <div className="profile-section">
                    <span className="stat-label">Tillagda barer ({myVenues.length})</span>
                    {myVenues.length === 0 ? (
                      <p className="venue-panel-hint">Du har inte lagt till några barer ännu</p>
                    ) : myVenues.map((v) => (
                      <div key={v.id} className="profile-venue-item">
                        <span>{v.name || "Okänd bar"}</span>
                        {v.price && v.volym ? (
                          <span className="profile-venue-price">{v.price} kr / {v.volym} cl</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Reviews with vote counts */}
              {(() => {
                const myReviews = reviews.filter((r) => r.user_id === user.id)
                return (
                  <div className="profile-section">
                    <span className="stat-label">Dina recensioner ({myReviews.length})</span>
                    {myReviews.length === 0 ? (
                      <p className="venue-panel-hint">Du har inte skrivit några recensioner ännu</p>
                    ) : myReviews.map((r) => {
                      const venue = venues.find((v) => v.id === r.venue_id)
                      const net = reviewVotes
                        .filter((rv) => rv.review_id === r.id)
                        .reduce((s, rv) => s + rv.value, 0)
                      return (
                        <div key={r.id} className="profile-review-item">
                          <div className="profile-review-header">
                            <strong>{venue?.name || "Okänd bar"}</strong>
                            <div className="profile-review-meta">
                              <span className="profile-review-rating">{r.rating}/10</span>
                              <span className={`profile-review-votes ${net > 0 ? "positive" : net < 0 ? "negative" : ""}`}>
                                {net > 0 ? `▲ +${net}` : net < 0 ? `▼ ${net}` : "0 röster"}
                              </span>
                            </div>
                          </div>
                          {r.text && <p className="profile-review-text">{r.text}</p>}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              <button className="btn-danger" onClick={handleLogout}>Logga ut</button>
            </>
          ) : (
            <AuthForm />
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
          useRatingFilter={useRatingFilter}
          setUseRatingFilter={setUseRatingFilter}
          minRating={minRating}
          setMinRating={setMinRating}
        />
      )}
    </div>
  )
}

export default App
