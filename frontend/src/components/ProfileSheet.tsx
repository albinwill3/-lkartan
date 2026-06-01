import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import type { Venue } from "../data/venues"
import type { Review } from "../data/reviews"
import type { Vote } from "../data/votes"
import AuthForm from "./AuthForm"

export default function ProfileSheet({
  user,
  venues,
  reviews,
  votes,
  onLogout,
}: {
  user: User | null
  venues: Venue[]
  reviews: Review[]
  votes: Vote[]
  onLogout: () => void
}) {
  const [showVenues, setShowVenues] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  if (!user) return <AuthForm />

  const myVenues = venues.filter((v) => v.user_id === user.id)
  const myReviews = reviews.filter((r) => r.user_id === user.id)
  const myVenueIds = new Set(myVenues.map((v) => v.id))
  const totalUp   = votes.filter((v) => myVenueIds.has(v.venue_id) && v.value === 1).length
  const totalDown = votes.filter((v) => myVenueIds.has(v.venue_id) && v.value === -1).length

  return (
    <>
      <h2>Profil</h2>
      <p className="profile-email">{user.email}</p>

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

      {/* Tillagda barer */}
      <div className="profile-expandable">
        <button
          className="profile-expand-btn"
          onClick={() => setShowVenues((v) => !v)}
        >
          <span>Tillagda barer ({myVenues.length})</span>
          <span className={`expand-arrow ${showVenues ? "open" : ""}`}>›</span>
        </button>
        {showVenues && (
          <div className="profile-expand-content">
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
        )}
      </div>

      {/* Dina recensioner */}
      <div className="profile-expandable">
        <button
          className="profile-expand-btn"
          onClick={() => setShowReviews((v) => !v)}
        >
          <span>Dina recensioner ({myReviews.length})</span>
          <span className={`expand-arrow ${showReviews ? "open" : ""}`}>›</span>
        </button>
        {showReviews && (
          <div className="profile-expand-content">
            {myReviews.length === 0 ? (
              <p className="venue-panel-hint">Du har inte skrivit några recensioner ännu</p>
            ) : myReviews.map((r) => {
              const venue = venues.find((v) => v.id === r.venue_id)
              return (
                <div key={r.id} className="profile-review-item">
                  <div className="profile-review-header">
                    <strong>{venue?.name || "Okänd bar"}</strong>
                    <span className="profile-review-rating">{r.rating}/10</span>
                  </div>
                  {r.text && <p className="profile-review-text">{r.text}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button className="btn-danger" onClick={onLogout}>Logga ut</button>
    </>
  )
}
