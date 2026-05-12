export default function FilterSheet({
    guinnessFilter,
    setGuinnessFilter,
    maxPricePerCl,
    setMaxPricePerCl,
    cheapestPricePerCl,
    mostExpensivePricePerCl,
    usePriceFilter,
    setUsePriceFilter,
}: {
    guinnessFilter: "all" | "yes" | "no"
    setGuinnessFilter: (value: "all" | "yes" | "no") => void
    maxPricePerCl: number
    setMaxPricePerCl: (value: number) => void
    cheapestPricePerCl: number
    mostExpensivePricePerCl: number
    usePriceFilter: boolean
    setUsePriceFilter: (value: boolean) => void

}) {
    return (
        <div className="filter-sheet">
            <h2>Filter</h2>

            <label>Guinness</label>
            <select
                value={guinnessFilter}
                onChange={(e) =>
                    setGuinnessFilter(e.target.value as "all" | "yes" | "no")
                }
            >
                <option value="all">Alla</option>
                <option value="yes">Har Guinness</option>
                <option value="no">Har inte Guinness</option>
            </select>
            <label>
                <input
                    type="checkbox"
                    checked={usePriceFilter}
                    onChange={(e) => setUsePriceFilter(e.target.checked)}
                />
                Filtrera på pris per cl
            </label>
            {usePriceFilter && (
                <>
                    <label>
                        Maxpris: {maxPricePerCl.toFixed(2)} kr/cl
                    </label>

                    <input
                        type="range"
                        min={cheapestPricePerCl}
                        max={mostExpensivePricePerCl}
                        step="0.01"
                        value={maxPricePerCl}
                        onChange={(e) => setMaxPricePerCl(Number(e.target.value))}
                    />
                </>
            )}

        </div>
    )
}