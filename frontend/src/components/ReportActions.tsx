import { useRef, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { Report } from "../data/reports"
import { supabase } from "../lib/supabase"

export default function ReportActions({ report, userId, onEdit, onDeleted }: {
  report: Report
  userId: string | null
  onEdit: (report: Report) => void
  onDeleted: (reportId: number) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const deleteInFlight = useRef(false)

  if (!userId || report.user_id !== userId) return null

  async function handleDelete() {
    if (!confirming || deleteInFlight.current || report.user_id !== userId) return
    deleteInFlight.current = true
    setDeleting(true)
    setErrorMessage("")
    try {
      const { data, error } = await supabase.from("reports").delete()
        .eq("id", report.id).eq("user_id", userId).select("id")
      if (error || !data?.length) {
        setErrorMessage("Kunde inte ta bort rapporten. Den kan redan vara borttagen. Försök igen.")
        return
      }
      onDeleted(report.id)
    } catch {
      setErrorMessage("Kunde inte ta bort rapporten. Kontrollera anslutningen och försök igen.")
    } finally {
      deleteInFlight.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="report-actions" aria-busy={deleting}>
      {confirming ? (
        <>
          <p>Ta bort rapporten? Även dess röster och recensioner tas bort.</p>
          <div className="report-action-buttons">
            <button className="report-delete-confirm" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={16} aria-hidden="true" />{deleting ? "Tar bort..." : "Ta bort"}
            </button>
            <button onClick={() => { setConfirming(false); setErrorMessage("") }} disabled={deleting}>Avbryt</button>
          </div>
        </>
      ) : (
        <div className="report-action-buttons">
          <button className="report-icon-button" title="Ändra rapport" aria-label="Ändra rapport" onClick={() => onEdit(report)}>
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button className="report-icon-button report-delete" title="Ta bort rapport" aria-label="Ta bort rapport" onClick={() => setConfirming(true)}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {errorMessage && <p className="message error" role="alert">{errorMessage}</p>}
    </div>
  )
}
