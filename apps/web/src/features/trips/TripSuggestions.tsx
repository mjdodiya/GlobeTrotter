import { useState } from "react"

import { SuggestionCard } from "./SuggestionCard"
import { placeSuggestions } from "./tripData"

export function TripSuggestions() {
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([])

  function togglePlace(title: string) {
    setSelectedPlaces((current) => current.includes(title) ? current.filter((place) => place !== title) : [...current, title])
  }

  return (
    <section aria-labelledby="suggestions-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id="suggestions-heading" className="font-heading text-[25px] font-semibold leading-tight text-[#0f2744]">Suggestions for Places to Visit / Activities to Perform</h2>
          <p className="mt-1 text-[11px] text-[#7890a3]">Choose the experiences you want to include in your itinerary.</p>
        </div>
        {selectedPlaces.length > 0 ? <span className="shrink-0 text-[11px] font-semibold text-[#0d7a8a]">{selectedPlaces.length} selected</span> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {placeSuggestions.map((suggestion) => <SuggestionCard key={suggestion.title} suggestion={suggestion} selected={selectedPlaces.includes(suggestion.title)} onToggle={() => togglePlace(suggestion.title)} />)}
      </div>
    </section>
  )
}
