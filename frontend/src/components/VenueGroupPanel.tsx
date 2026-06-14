import { useState } from "react"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { getTempLabel } from "../utils/temperature"
import type { Venue } from "../data/venues"
import { isOpenNow, initHoursGroups, buildOpeningHours } from "../utils/openingHours"
import type { HoursGroup } from "../utils/openingHours"
import OpeningHoursEditor from "./OpeningHoursEditor"
import TempSelector from "./TempSelector"

function netVotes(venueId: number, votes: Vote[]): number {
  return votes.filter((v) => v.venue_id === venueId).reduce((s, v) => s + v.value, 0)
}

function myVoteValue(venueId: number, userId: string, votes: Vote[]): 1 | -1 | 0 {
  const v = votes.find((v) => v.venue_id === venueId && v.user_id === userId)
  return (v?.value ?? 0) as 1 | -1 | 0
}

function SubmissionCard({
  venue,
  votes,
  reviews,
  user,
  onVoteChange,
  onAddReview,
  userAlreadyReviewed,
  onVenuesChanged,
}: {
  venue: Venue
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (venueId: number) => void
  userAlreadyReviewed: boolean
  onVenuesChanged: () => void
}) {
  const net = netVotes(venue.id, votes)
  const myVote = user ? myVoteValue(venue.id, user.id, votes) : 0
  const isOwnPost = user?.id === venue.user_id
  const [voting, setVoting] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showEditHours, setShowEditHours] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editVolym, setEditVolym] = useState("")
  const [editKanna, setEditKanna] = useState("")
  const [editBeerType, setEditBeerType] = useState("")
  const [editTemp, setEditTemp] = useState(2)
  const [editGuinness, setEditGuinness] = useState(false)
  const [editHoursGroups, setEditHoursGroups] = useState<HoursGroup[]>([])

  const venueReviews = reviews.filter((r) => r.venue_id === venue.id)
  const openStatus = isOpenNow(venue.opening_hours)

  function startEdit() {
    setEditName(venue.name)
    setEditPrice(String(venue.price || ""))
    setEditVolym(String(venue.volym || ""))
    setEditKanna(String(venue.kannaPrice || ""))
    setEditBeerType(venue.beerType || "")
    setEditTemp(venue.temperature || 2)
    setEditGuinness(venue.guinness || false)
    setEditHoursGroups(initHoursGroups(venue.opening_hours))
    setEditing(true)
  }

  function updateEditGroup(i: number, patch: Partial<HoursGroup>) {
    setEditHoursGroups((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)))
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from("venues").update({
      name: editName,
      price: Number(editPrice),
      volym: Number(editVolym),
      kannaPrice: Number(editKanna),
      beerType: editBeerType,
      temperature: editTemp,
      guinness: editGuinness,
      opening_hours: buildOpeningHours(editHoursGroups),
    }).eq("id", venue.id)
    setSaving(false)
    if (error) { console.error(error); return }
    setEditing(false)
    onVenuesChanged()
  }

  async function handleDelete() {
    if (!confirm(`Ta bort rapporten för "${venue.name}"?`)) return
    const { error } = await supabase.from("venues").delete().eq("id", venue.id)
    if (error) { console.error(error); return }
    onVenuesChanged()
  }

  async function handleVote(value: 1 | -1) {
    if (!user || voting) return
    setVoting(true)
    if (myVote === value) {
      await supabase.from("votes").delete().eq("user_id", user.id).eq("venue_id", venue.id)
    } else {
      await supabase.from("votes").upsert(
        { user_id: user.id, venue_id: venue.id, value },
        { onConflict: "user_id,venue_id" }
      )
    }
    const { data } = await supabase.from("votes").select("*")
    if (data) onVoteChange(data as Vote[])
    setVoting(false)
  }

  if (editing) {
    return (
      <div className="submission-card edit-mode">
        <div className="edit-form-inline">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Namn på baren"
          />
          <div className="form-row">
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="Pris (kr)"
            />
            <input
              type="number"
              value={editVolym}
              onChange={(e) => setEditVolym(e.target.value)}
              placeholder="Volym (cl)"
            />
          </div>
          <input
            type="number"
            value={editKanna}
            onChange={(e) => setEditKanna(e.target.value)}
            placeholder="Kannapris (kr)"
          />
          <input
            value={editBeerType}
            onChange={(e) => setEditBeerType(e.target.value)}
            placeholder="Ölsort"
          />
          <div className="filter-group">
            <label className="stat-label">Temperatur</label>
            <TempSelector value={editTemp} onChange={setEditTemp} />
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={editGuinness}
              onChange={(e) => setEditGuinness(e.target.checked)}
            />
            <span className="custom-checkbox"></span>
            Guinness på tap
          </label>
          <div className="filter-group">
            <button
              type="button"
              className="hours-toggle-btn"
              onClick={() => setShowEditHours((v) => !v)}
            >
              <span>Öppettider</span>
              <span className={`expand-arrow ${showEditHours ? "open" : ""}`}>›</span>
            </button>
            {showEditHours && (
              <OpeningHoursEditor groups={editHoursGroups} onChange={updateEditGroup} />
            )}
          </div>
          <div className="edit-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Sparar..." : "Spara"}
            </button>
            <button className="btn-ghost" onClick={() => setEditing(false)}>Avbryt</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div className="submission-meta">
          {venue.price && venue.volym ? (
            <span className="submission-price">
              {venue.price} kr / {venue.volym} cl
              <span className="submission-per-cl">
                ({(venue.price / venue.volym).toFixed(2)} kr/cl)
              </span>
            </span>
          ) : <span className="submission-price">Pris okänt</span>}
          {openStatus !== null && (
            <span className={openStatus ? "open-badge" : "closed-badge"}>
              {openStatus ? "Öppet nu" : "Stängt"}
            </span>
          )}
        </div>
        <div className="vote-controls">
          <button
            className={`vote-btn up ${myVote === 1 ? "active" : ""}`}
            onClick={() => handleVote(1)}
            disabled={!user || voting || isOwnPost}
            title={isOwnPost ? "Du kan inte rösta på egna inlägg" : user ? "Rösta upp" : "Logga in för att rösta"}
          >▲</button>
          <span className={`vote-count ${net > 0 ? "positive" : net < 0 ? "negative" : ""}`}>
            {net > 0 ? `+${net}` : net}
          </span>
          <button
            className={`vote-btn down ${myVote === -1 ? "active" : ""}`}
            onClick={() => handleVote(-1)}
            disabled={!user || voting || isOwnPost}
            title={isOwnPost ? "Du kan inte rösta på egna inlägg" : user ? "Rösta ner" : "Logga in för att rösta"}
          >▼</button>
        </div>
      </div>

      <div className="submission-details">
        {venue.beerType && <span className="detail-chip">{venue.beerType}</span>}
        {venue.guinness && <span className="detail-chip guinness">Guinness ✓</span>}
        {venue.kannaPrice ? <span className="detail-chip">Kanna: {venue.kannaPrice} kr</span> : null}
        {venue.temperature ? <span className="detail-chip">{getTempLabel(venue.temperature)}</span> : null}
      </div>

      <div className="submission-actions">
        {user && (
          userAlreadyReviewed ? (
            <span className="submission-hint">Du har recenserat</span>
          ) : (
            <button className="submission-review-btn" onClick={() => onAddReview(venue.id)}>
              + Recension
            </button>
          )
        )}
        {isOwnPost && (
          <div className="submission-owner-actions">
            <button className="btn-edit-inline" onClick={startEdit}>Redigera</button>
            <button className="btn-delete-inline" onClick={handleDelete}>Ta bort</button>
          </div>
        )}
        <button
          className="submission-toggle-reviews"
          onClick={() => setShowReviews((v) => !v)}
        >
          {showReviews ? "Dölj" : `Recensioner (${venueReviews.length})`}
        </button>
      </div>

      {showReviews && (
        <div className="submission-reviews">
          {venueReviews.length === 0 ? (
            <p className="venue-panel-hint">Inga recensioner ännu</p>
          ) : venueReviews.map((r) => (
            <div key={r.id} className="venue-review-item">
              <strong>{r.rating}/10</strong>
              {r.text && <p>{r.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VenueGroupPanel({
  group,
  votes,
  reviews,
  user,
  onClose,
  onVoteChange,
  onAddReview,
  onVenuesChanged,
}: {
  group: VenueGroup
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onClose: () => void
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (venueId: number) => void
  onVenuesChanged: () => void
}) {
  const sorted = [...group.venues].sort(
    (a, b) => netVotes(b.id, votes) - netVotes(a.id, votes)
  )

  const userReviewedIds = user
    ? new Set(reviews.filter((r) => r.user_id === user.id).map((r) => r.venue_id))
    : new Set<number>()

  return (
    <div className="venue-panel-overlay" onClick={onClose}>
      <div className="venue-panel" onClick={(e) => e.stopPropagation()}>
        <button className="venue-panel-close" onClick={onClose}>✕</button>

        <h2>{group.name}</h2>

        {group.venues.length > 1 && (
          <p className="group-count-hint">
            {group.venues.length} rapporter — rösta upp den korrekta
          </p>
        )}

        <div className="submission-list">
          {sorted.map((venue) => (
            <SubmissionCard
              key={venue.id}
              venue={venue}
              votes={votes}
              reviews={reviews}
              user={user}
              onVoteChange={onVoteChange}
              onAddReview={onAddReview}
              userAlreadyReviewed={userReviewedIds.has(venue.id)}
              onVenuesChanged={onVenuesChanged}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
