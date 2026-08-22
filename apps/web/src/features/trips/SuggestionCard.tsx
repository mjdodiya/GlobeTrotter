import { Check } from "lucide-react"

import type { PlaceSuggestion } from "./tripData"

export function SuggestionCard({ suggestion, selected, onToggle }: { suggestion: PlaceSuggestion; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onToggle} className={`group relative overflow-hidden rounded-xl border bg-white text-left shadow-[0_2px_8px_rgba(15,39,68,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_7px_18px_rgba(15,39,68,.12)] ${selected ? "border-[#0d7a8a] ring-2 ring-[#0d7a8a]/20" : "border-[#e0e6eb]"}`}>
      <div className="relative h-[150px] overflow-hidden bg-[#dce7eb]">
        <img src={suggestion.image} alt="" loading="lazy" className="size-full object-cover object-center saturate-[.8] transition duration-500 group-hover:scale-105" />
        {selected ? <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-[#0d7a8a] text-white shadow"><Check className="size-4" aria-hidden="true" /></span> : null}
      </div>
      <div className="px-3.5 py-3">
        <h3 className="font-heading text-[19px] font-semibold leading-none text-[#0f2744]">{suggestion.title}</h3>
        <p className="mt-1.5 text-[10px] font-medium text-[#7890a3]">{suggestion.category}</p>
      </div>
    </button>
  )
}
