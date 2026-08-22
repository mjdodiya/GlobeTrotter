import { CalendarDays } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type TripDetails = {
  name: string
  place: string
  startDate: string
  endDate: string
}

export function TripDetailsForm({ details, onChange }: { details: TripDetails; onChange: (details: TripDetails) => void }) {
  function update(field: keyof TripDetails, value: string) {
    onChange({ ...details, [field]: value })
  }

  return (
    <Card className="rounded-xl border-[#e1e6ea] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]">
      <CardContent className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="trip-name" className="text-[10px] font-semibold uppercase tracking-wide text-[#344d68]">Trip Name</Label>
          <Input id="trip-name" value={details.name} onChange={(event) => update("name", event.target.value)} placeholder="Paris Summer Adventure" className="h-10 rounded-lg border-[#d9e1ea] text-xs placeholder:text-[#91a2b1] focus-visible:border-[#0d7a8a] focus-visible:ring-[#0d7a8a]/20" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trip-place" className="text-[10px] font-semibold uppercase tracking-wide text-[#344d68]">Select a Place</Label>
          <Input id="trip-place" value={details.place} onChange={(event) => update("place", event.target.value)} placeholder="Paris, France" className="h-10 rounded-lg border-[#d9e1ea] text-xs placeholder:text-[#91a2b1] focus-visible:border-[#0d7a8a] focus-visible:ring-[#0d7a8a]/20" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-[10px] font-semibold uppercase tracking-wide text-[#344d68]">Start Date</Label>
          <div className="relative">
            <Input id="start-date" type="date" value={details.startDate} onChange={(event) => update("startDate", event.target.value)} className="h-10 rounded-lg border-[#d9e1ea] pr-10 text-xs text-[#526984] focus-visible:border-[#0d7a8a] focus-visible:ring-[#0d7a8a]/20" />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#526984]" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date" className="text-[10px] font-semibold uppercase tracking-wide text-[#344d68]">End Date</Label>
          <div className="relative">
            <Input id="end-date" type="date" value={details.endDate} onChange={(event) => update("endDate", event.target.value)} className="h-10 rounded-lg border-[#d9e1ea] pr-10 text-xs text-[#526984] focus-visible:border-[#0d7a8a] focus-visible:ring-[#0d7a8a]/20" />
            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#526984]" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
