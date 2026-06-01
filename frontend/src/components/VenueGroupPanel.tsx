import { useState } from "react"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { getTempLabel } from "../utils/temperature"
import type { Venue } from "../data/venues"

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
}: {
  venue: Venue
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (venueId: number) => void
  userAlreadyReviewed: boolean
}) {
  const net = netVotes(venue.id, votes)
  const myVote = user ? myVoteValue(venue.id, user.id, votes) : 0
  const isOwnPost = user?.id === venue.user_id
  const [voting, setVoting] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  const venueReviews = reviews.filter((r) => r.venue_id === venue.id)

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
}: {
  group: VenueGroup
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onClose: () => void
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (venueId: number) => void
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
            />
          ))}
        </div>
      </div>
    </div>
  )
}
