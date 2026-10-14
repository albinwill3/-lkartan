import { useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

export default function ReviewModal({
    reportId,
    user,
    onClose,
    onReviewAdded,
}: {
    reportId: number
    user: User
    onClose: () => void
    onReviewAdded: () => void
}) {
    const [rating, setRating] = useState(5)
    const [text, setText] = useState("")
    const [saving, setSaving] = useState(false)
    const saveInFlight = useRef(false)
    const [errorMessage, setErrorMessage] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (saveInFlight.current) return
        setErrorMessage("")
        if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
            setErrorMessage("Välj ett betyg mellan 1 och 10.")
            return
        }
        saveInFlight.current = true
        setSaving(true)

        try {
            const { error } = await supabase.from("reviews").insert({
                report_id: reportId,
                user_id: user.id,
                rating,
                text: text.trim(),
            })
            if (error) {
                setErrorMessage("Kunde inte spara recensionen. Försök igen.")
                return
            }
            onReviewAdded()
            onClose()
        } catch {
            setErrorMessage("Kunde inte spara recensionen. Kontrollera anslutningen och försök igen.")
        } finally {
            saveInFlight.current = false
            setSaving(false)
        }
    }

    return (
        <div className="review-modal">
            <form className="review-card" onSubmit={handleSubmit} aria-busy={saving}>
                <h2>Lägg till recension</h2>

                <label>Rating: {rating}/10</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={rating}
                    disabled={saving}
                    onChange={(e) => setRating(Number(e.target.value))}
                />

                <textarea
                    placeholder="Skriv recension..."
                    value={text}
                    disabled={saving}
                    onChange={(e) => setText(e.target.value)}
                />

                {errorMessage && <p className="message error" role="alert">{errorMessage}</p>}
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Sparar..." : "Spara recension"}
                </button>
                <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
                    Stäng
                </button>
            </form>
        </div>
    )
}
