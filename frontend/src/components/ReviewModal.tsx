import { useState } from "react"
import { supabase } from "../lib/supabase"
import type { User } from "@supabase/supabase-js"

export default function ReviewModal({
    venueId,
    user,
    onClose,
    onReviewAdded,
}: {
    venueId: number
    user: User
    onClose: () => void
    onReviewAdded: () => void
}) {
    const [rating, setRating] = useState(5)
    const [text, setText] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const { data, error } = await supabase
            .from("reviews")

            .insert({
                venue_id: venueId,
                user_id: user.id,
                rating,
                text,
            })
            .select()

        if (error) {
            console.error("Kunde inte spara recension:", error)
            alert(error.message)
            return
        }

        console.log("Recension sparad:", data)

        setRating(5)
        setText("")
        onReviewAdded()
        onClose()
    }

    return (
        <div className="review-modal">
            <form className="review-card" onSubmit={handleSubmit}>
                <h2>Lägg till recension</h2>

                <label>Rating: {rating}/10</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                />

                <textarea
                    placeholder="Skriv recension..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />

                <button type="submit" className="btn-primary">Spara recension</button>
                <button type="button" className="btn-ghost" onClick={onClose}>
                    Stäng
                </button>
            </form>
        </div>
    )
}