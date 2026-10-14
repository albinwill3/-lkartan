export default function RangeSlider({
  min,
  max,
  value,
  step = 1,
  onChange,
}: {
  min: number
  max: number
  value: number
  step?: number
  onChange: (v: number) => void
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`,
      }}
    />
  )
}
