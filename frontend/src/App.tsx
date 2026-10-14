import MapView from "./components/MapView"
import AddVenuesForm from "./components/AddVenues"
import { useState, useEffect, useMemo } from "react"
import { supabase } from "./lib/supabase"
import type { Venue } from "./data/venues"
import type { Report } from "./data/reports"
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
  const [reports, setReports] = useState<Report[]>([])
  const [reportVenue, setReportVenue] = useState<Venue | null>(null)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
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
    const [venueResult, reportResult] = await Promise.all([
      supabase.from("venues").select("*"),
      supabase.from("reports").select("*"),
    ])
    if (venueResult.error || reportResult.error) {
      console.error(venueResult.error ?? reportResult.error)
      return
    }
    setVenues(venueResult.data as Venue[])
    setReports(reportResult.data as Report[])
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

    const dataChannel = supabase
      .channel("app-data-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "venues" }, () => {
        fetchVenues()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        fetchVenues()
        if (payload.eventType === "DELETE") {
          fetchReviews()
          fetchVotes()
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => {
        fetchReviews()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        fetchVotes()
      })
      .subscribe((status) => {
        // Catch changes made before subscribing or while disconnected.
        if (status === "SUBSCRIBED") {
          fetchVenues()
          fetchReviews()
          fetchVotes()
        }
      })

    return () => {
      listener.subscription.unsubscribe()
      supabase.removeChannel(dataChannel)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function closeSheets() {
    setShowProfile(false)
    setShowFilter(false)
  }

  function handlePlaceConfirmed(coords: { lat: number; lng: number }) {
    setEditingReport(null)
    setReportVenue(null)
    setSelectedCoords(coords)
    setPlacingMode(false)
    setShowAddForm(true)
    setShowProfile(false)
    setShowFilter(false)
  }

  function handleCancelPlace() {
    setPlacingMode(false)
  }

  function handleEditReport(report: Report) {
    const venue = venues.find((v) => v.id === report.venue_id)
    if (!venue || !user || report.user_id !== user.id) return
    setEditingReport(report)
    setReportVenue(venue)
    setSelectedCoords({ lat: venue.lat, lng: venue.lng })
    setPlacingMode(false)
    setShowAddForm(true)
    closeSheets()
  }

  function handleReportDeleted(reportId: number) {
    setReports((current) => current.filter((r) => r.id !== reportId))
    setVotes((current) => current.filter((v) => v.report_id !== reportId))
    setReviews((current) => current.filter((r) => r.report_id !== reportId))
  }

  const pricePerClValues = reports.filter((v) => v.volym > 0).map((v) => v.price / v.volym)
  const cheapestPricePerCl = pricePerClValues.length > 0 ? Math.min(...pricePerClValues) : 0
  const mostExpensivePricePerCl = pricePerClValues.length > 0 ? Math.max(...pricePerClValues) : 5

  const pricePerOlValues = reports.filter((v) => v.price > 0).map((v) => v.price)
  const cheapestPricePerOl = pricePerOlValues.length > 0 ? Math.min(...pricePerOlValues) : 0
  const mostExpensivePricePerOl = pricePerOlValues.length > 0 ? Math.max(...pricePerOlValues) : 200

  const reviewRatings = useMemo(() => {
    const ratings = new Map<number, { sum: number; count: number }>()
    for (const review of reviews) {
      const totals = ratings.get(review.report_id) ?? { sum: 0, count: 0 }
      totals.sum += review.rating
      totals.count++
      ratings.set(review.report_id, totals)
    }
    return ratings
  }, [reviews])

  const filteredReports = useMemo(() => reports.filter((venue) => {
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
      const totals = reviewRatings.get(venue.id)
      const hasOwnRating = venue.rating > 0
      const count = (totals?.count ?? 0) + (hasOwnRating ? 1 : 0)
      const sum = (totals?.sum ?? 0) + (hasOwnRating ? venue.rating : 0)
      const avg = count ? sum / count : null
      matchesRating = avg !== null && avg >= minRating
    }

    const matchesOpenNow = !openNowFilter || isOpenNow(venue.opening_hours) === true
    return matchesGuinness && matchesPrice && matchesRating && matchesOlPrice && matchesOpenNow
  }), [reports, reviewRatings, guinnessFilter, usePriceOlFilter, maxPricePerOl, usePriceFilter, maxPricePerCl, useRatingFilter, minRating, openNowFilter])

  const hasFilters = guinnessFilter !== "all" || usePriceOlFilter || usePriceFilter || useRatingFilter || openNowFilter
  const venueGroups = useMemo(() => groupVenues(venues, filteredReports)
    .filter((group) => !hasFilters || group.reports.length > 0), [venues, filteredReports, hasFilters])

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
        onEditReport={handleEditReport}
        onReportDeleted={handleReportDeleted}
        onAddReport={(venueId) => {
          const venue = venues.find((v) => v.id === venueId)
          if (!venue || !user) return
          setEditingReport(null)
          setReportVenue(venue)
          setSelectedCoords({ lat: venue.lat, lng: venue.lng })
          setShowAddForm(true)
          closeSheets()
        }}
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
            key={editingReport ? `edit-${editingReport.id}` : reportVenue?.id ?? "new"}
            selectedCoords={selectedCoords}
            venue={reportVenue}
            reportToEdit={editingReport}
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
            reports={reports}
            reviews={reviews}
            votes={votes}
            onLogout={handleLogout}
            onEditReport={handleEditReport}
            onReportDeleted={handleReportDeleted}
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
