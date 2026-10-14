import { useRef, useState } from "react"
import type { VenueGroup } from "../utils/groupVenues"
import type { Vote } from "../data/votes"
import type { Review } from "../data/reviews"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { getTempLabel } from "../utils/temperature"
import type { Report } from "../data/reports"
import ReportActions from "./ReportActions"
import { isOpenNow } from "../utils/openingHours"

function netVotes(reportId: number, votes: Vote[]): number {
  return votes.filter((v) => v.report_id === reportId).reduce((s, v) => s + v.value, 0)
}

function myVoteValue(reportId: number, userId: string, votes: Vote[]): 1 | -1 | 0 {
  const v = votes.find((v) => v.report_id === reportId && v.user_id === userId)
  return (v?.value ?? 0) as 1 | -1 | 0
}

function SubmissionCard({
  report,
  votes,
  reviews,
  user,
  onVoteChange,
  onAddReview,
  userAlreadyReviewed,
  onEditReport,
  onReportDeleted,
}: {
  report: Report
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (reportId: number) => void
  userAlreadyReviewed: boolean
  onEditReport: (report: Report) => void
  onReportDeleted: (reportId: number) => void
}) {
  const net = netVotes(report.id, votes)
  const myVote = user ? myVoteValue(report.id, user.id, votes) : 0
  const isOwnPost = user?.id === report.user_id
  const [voting, setVoting] = useState(false)
  const voteInFlight = useRef(false)
  const [voteError, setVoteError] = useState("")
  const [showReviews, setShowReviews] = useState(false)

  const reportReviews = reviews.filter((r) => r.report_id === report.id)
  const openStatus = isOpenNow(report.opening_hours)

  async function handleVote(value: 1 | -1) {
    if (!user || isOwnPost || voteInFlight.current) return
    voteInFlight.current = true
    setVoting(true)
    setVoteError("")
    let saved = false
    try {
      const { error } = myVote === value
        ? await supabase.from("votes").delete().eq("user_id", user.id).eq("report_id", report.id)
        : await supabase.from("votes").upsert(
          { user_id: user.id, report_id: report.id, value },
          { onConflict: "user_id,report_id" }
        )
      if (error) {
        setVoteError("Kunde inte spara rösten. Försök igen.")
        return
      }
      saved = true
      const { data, error: refreshError } = await supabase.from("votes").select("*")
      if (refreshError || !data) {
        setVoteError("Rösten sparades, men röstresultatet kunde inte uppdateras.")
        return
      }
      onVoteChange(data as Vote[])
    } catch {
      setVoteError(saved
        ? "Rösten sparades, men röstresultatet kunde inte uppdateras."
        : "Kunde inte spara rösten. Kontrollera anslutningen och försök igen.")
    } finally {
      voteInFlight.current = false
      setVoting(false)
    }
  }

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div className="submission-meta">
          {report.price && report.volym ? (
            <span className="submission-price">
              {report.price} kr / {report.volym} cl
              <span className="submission-per-cl">
                ({(report.price / report.volym).toFixed(2)} kr/cl)
              </span>
            </span>
          ) : <span className="submission-price">Pris okänt</span>}
          {openStatus !== null && (
            <span className={openStatus ? "open-badge" : "closed-badge"}>
              {openStatus ? "Öppet nu" : "Stängt"}
            </span>
          )}
        </div>
        <div className="vote-controls" aria-busy={voting}>
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

      {voteError && <p className="message error" role="alert">{voteError}</p>}
      <ReportActions report={report} userId={user?.id ?? null} onEdit={onEditReport} onDeleted={onReportDeleted} />

      <div className="submission-details">
        {report.beerType && <span className="detail-chip">{report.beerType}</span>}
        {report.guinness && <span className="detail-chip guinness">Guinness ✓</span>}
        {report.kannaPrice ? <span className="detail-chip">Kanna: {report.kannaPrice} kr</span> : null}
        {report.temperature ? <span className="detail-chip">{getTempLabel(report.temperature)}</span> : null}
      </div>

      <div className="submission-actions">
        {user && (
          userAlreadyReviewed ? (
            <span className="submission-hint">Du har recenserat</span>
          ) : (
            <button className="submission-review-btn" onClick={() => onAddReview(report.id)}>
              + Recension
            </button>
          )
        )}
        <button
          className="submission-toggle-reviews"
          onClick={() => setShowReviews((v) => !v)}
        >
          {showReviews ? "Dölj" : `Recensioner (${reportReviews.length})`}
        </button>
      </div>

      {showReviews && (
        <div className="submission-reviews">
          {reportReviews.length === 0 ? (
            <p className="venue-panel-hint">Inga recensioner ännu</p>
          ) : reportReviews.map((r) => (
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
  onAddReport,
  onEditReport,
  onReportDeleted,
}: {
  group: VenueGroup
  votes: Vote[]
  reviews: Review[]
  user: User | null
  onClose: () => void
  onVoteChange: (votes: Vote[]) => void
  onAddReview: (reportId: number) => void
  onAddReport: () => void
  onEditReport: (report: Report) => void
  onReportDeleted: (reportId: number) => void
}) {
  const sorted = [...group.reports].sort(
    (a, b) => netVotes(b.id, votes) - netVotes(a.id, votes)
  )

  const userReviewedIds = user
    ? new Set(reviews.filter((r) => r.user_id === user.id).map((r) => r.report_id))
    : new Set<number>()

  return (
    <div className="venue-panel-overlay" onClick={onClose}>
      <div className="venue-panel" onClick={(e) => e.stopPropagation()}>
        <button className="venue-panel-close" onClick={onClose}>✕</button>

        <h2>{group.name}</h2>
        {user && (
          <button className="btn-primary" onClick={onAddReport}>Rapportera nytt pris</button>
        )}

        {group.reports.length > 1 && (
          <p className="group-count-hint">
            {group.reports.length} rapporter — rösta upp den korrekta
          </p>
        )}

        <div className="submission-list">
          {sorted.map((report) => (
            <SubmissionCard
              key={report.id}
              report={report}
              votes={votes}
              reviews={reviews}
              user={user}
              onVoteChange={onVoteChange}
              onAddReview={onAddReview}
              userAlreadyReviewed={userReviewedIds.has(report.id)}
              onEditReport={onEditReport}
              onReportDeleted={onReportDeleted}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
