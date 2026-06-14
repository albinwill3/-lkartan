import type { HoursGroup } from "../utils/openingHours"

export default function OpeningHoursEditor({
  groups,
  onChange,
}: {
  groups: HoursGroup[]
  onChange: (i: number, patch: Partial<HoursGroup>) => void
}) {
  return (
    <div className="hours-groups">
      {groups.map((g, i) => (
        <div key={g.label} className="hours-row">
          <span className="hours-day-label">{g.label}</span>
          {g.closed ? (
            <span className="hours-closed-text">Stängt</span>
          ) : (
            <span className="hours-time-range">
              <input
                type="time"
                className="hours-time-input"
                value={g.open}
                onChange={(e) => onChange(i, { open: e.target.value })}
              />
              <span className="hours-dash">–</span>
              <input
                type="time"
                className="hours-time-input"
                value={g.close}
                onChange={(e) => onChange(i, { close: e.target.value })}
              />
            </span>
          )}
          <label className="hours-closed-label">
            <input
              type="checkbox"
              checked={g.closed}
              onChange={(e) => onChange(i, { closed: e.target.checked })}
            />
            Stängt
          </label>
        </div>
      ))}
    </div>
  )
}
