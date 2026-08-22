import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ItinerarySectionCard } from "./ItinerarySectionCard"
import type { ItinerarySection } from "./itineraryData"

export function ItinerarySectionList({ sections, onChange, onAdd, onRemove }: { sections: ItinerarySection[]; onChange: (section: ItinerarySection) => void; onAdd: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {sections.map((section, index) => <ItinerarySectionCard key={section.id} section={section} number={index + 1} onChange={onChange} onRemove={() => onRemove(section.id)} />)}
      <Button type="button" variant="outline" onClick={onAdd} className="h-11 w-full rounded-xl border-dashed border-[#b9cbd8] bg-transparent text-xs font-semibold text-[#7890a3] hover:border-[#0d7a8a] hover:bg-[#f4f8f8] hover:text-[#0d7a8a]"><Plus className="size-4" aria-hidden="true" /> Add Section</Button>
    </div>
  )
}
