import { getTempLabel } from "../utils/temperature"

const TEMPS = [1, 2, 3, 4] as const

export default function TempSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="temp-selector">
      {TEMPS.map((t) => (
        <button
          key={t}
          type="button"
          className={`temp-option${value === t ? " active" : ""}`}
          onClick={() => onChange(t)}
        >
          {getTempLabel(t)}
        </button>
      ))}
    </div>
  )
}
