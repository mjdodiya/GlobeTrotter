import { CalendarDays, X } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ItinerarySection } from "./itineraryData"

export function ItinerarySectionCard({ section, number, onChange, onRemove }: { section: ItinerarySection; number: number; onChange: (section: ItinerarySection) => void; onRemove: () => void }) {
  function update(field: keyof ItinerarySection, value: string | number) {
    onChange({ ...section, [field]: value })
  }

  return (
    <Card className="rounded-xl border-[#dfe6eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0f2744] text-xs font-semibold text-white">{number}</span>
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-[#0f2744]">{section.title}</h2>
          <button type="button" onClick={onRemove} aria-label={`Remove ${section.title}`} className="rounded-md p-1 text-[#b5c5d2] transition hover:bg-[#fff1f1] hover:text-[#bd5c5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a8a]/30">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-3 rounded-lg bg-[#f4f7fa] px-3 py-3 text-[11px] leading-5 text-[#526984]">{section.description}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr_1fr] sm:items-end">
          <DateField id={`${section.id}-start`} label="Start date" value={section.startDate} onChange={(value) => update("startDate", value)} />
          <span className="hidden pb-2 text-sm text-[#8ba0b0] sm:block" aria-hidden="true">→</span>
          <DateField id={`${section.id}-end`} label="End date" value={section.endDate} onChange={(value) => update("endDate", value)} />
          <div className="space-y-1.5">
            <label htmlFor={`${section.id}-budget`} className="text-[10px] font-semibold text-[#526984]">Budget:</label>
            <div className="flex h-9 overflow-hidden rounded-lg border border-[#d9e1ea] focus-within:border-[#0d7a8a] focus-within:ring-2 focus-within:ring-[#0d7a8a]/20">
              <span className="flex items-center border-r border-[#d9e1ea] bg-[#f8fafb] px-3 text-xs text-[#7890a3]">$</span>
              <Input id={`${section.id}-budget`} type="number" min="0" step="10" value={section.budget} onChange={(event) => update("budget", Number(event.target.value) || 0)} aria-label={`${section.title} budget`} className="h-full rounded-none border-0 px-3 text-xs shadow-none focus-visible:ring-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-semibold text-[#526984]">{label}</label>
      <div className="relative">
        <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg border-[#d9e1ea] pr-9 text-[11px] text-[#526984] focus-visible:border-[#0d7a8a] focus-visible:ring-[#0d7a8a]/20" />
        <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#526984]" aria-hidden="true" />
      </div>
    </div>
  )
}
