export default function FilterSheet({
    guinnessFilter,
    setGuinnessFilter,
    maxPricePerCl,
    setMaxPricePerCl,
    maxPricePerOl,
    setMaxPricePerOl,
    cheapestPricePerOl,
    mostExpensivePricePerOl,
    cheapestPricePerCl,
    mostExpensivePricePerCl,
    usePriceFilter,
    setUsePriceOlFilter,
    usePriceOlFilter,
    setUsePriceFilter,
    useRatingFilter,
    setUseRatingFilter,
    minRating,
    setMinRating,
}: {
    guinnessFilter: "all" | "yes" | "no"
    setGuinnessFilter: (value: "all" | "yes" | "no") => void
    maxPricePerCl: number
    setMaxPricePerCl: (value: number) => void
    maxPricePerOl: number
    setMaxPricePerOl: (value: number) => void
    cheapestPricePerCl: number
    cheapestPricePerOl: number
    mostExpensivePricePerOl: number
    mostExpensivePricePerCl: number
    usePriceOlFilter: boolean
    setUsePriceOlFilter: (value: boolean) => void
    usePriceFilter: boolean
    setUsePriceFilter: (value: boolean) => void
    useRatingFilter: boolean
    setUseRatingFilter: (value: boolean) => void
    minRating: number
    setMinRating: (value: number) => void
}) {
    return (
        <div className="filter-sheet">
            <h2>Filter</h2>

            <div className="filter-group">
                <label>Guinness</label>
                <select
                    value={guinnessFilter}
                    onChange={(e) => setGuinnessFilter(e.target.value as "all" | "yes" | "no")}
                >
                    <option value="all">Alla</option>
                    <option value="yes">Har Guinness</option>
                    <option value="no">Har inte Guinness</option>
                </select>
            </div>

            {/* Pris per Birra */}
            <div className="filter-group">
                <label className="filter-toggle">
                    <input
                        type="checkbox"
                        checked={usePriceOlFilter}
                        onChange={(e) => setUsePriceOlFilter(e.target.checked)}
                    />
                    Filtrera på pris per birra
                </label>
                {usePriceOlFilter && (
                    <>
                        <span className="filter-value">Max: {maxPricePerOl} kr</span>
                        <input
                            type="range"
                            min={cheapestPricePerOl}
                            max={mostExpensivePricePerOl}
                            step="1"
                            value={maxPricePerOl}
                            onChange={(e) => setMaxPricePerOl(Number(e.target.value))}
                        />
                    </>
                )}
                {/* Pris per Cl */}
            </div>
            <div className="filter-group">
                <label className="filter-toggle">
                    <input
                        type="checkbox"
                        checked={usePriceFilter}
                        onChange={(e) => setUsePriceFilter(e.target.checked)}
                    />
                    Filtrera på pris per cl
                </label>
                {usePriceFilter && (
                    <>
                        <span className="filter-value">Max: {maxPricePerCl.toFixed(2)} kr/cl</span>
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

            <div className="filter-group">
                <label className="filter-toggle">
                    <input
                        type="checkbox"
                        checked={useRatingFilter}
                        onChange={(e) => setUseRatingFilter(e.target.checked)}
                    />
                    Filtrera på rating
                </label>
                {useRatingFilter && (
                    <>
                        <span className="filter-value">Min rating: {minRating}</span>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.1"
                            value={minRating}
                            onChange={(e) => setMinRating(Number(e.target.value))}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
