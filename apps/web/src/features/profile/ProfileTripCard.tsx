import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import type { PlannedTrip } from "./profileData"

export function ProfileTripCard({ trip }: { trip: PlannedTrip }) {
  const statusClass = trip.status === "Draft" ? "bg-[#fff2d9] text-[#bd7a13]" : "bg-[#edf4ff] text-[#4b83d6]"

  return (
    <Card className="overflow-hidden rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]">
      <img src={trip.image} alt={trip.title} loading="lazy" className="h-36 w-full object-cover" />
      <CardContent className="p-3">
        <h3 className="font-heading text-[18px] font-semibold leading-tight text-[#0f2744]">{trip.title}</h3>
        <p className="mt-1 text-[11px] text-[#7890a3]">{trip.location}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{trip.status}</span>
          <Button asChild type="button" variant="ghost" className="h-auto px-0 text-[11px] font-semibold text-[#0d7a8a] hover:bg-transparent hover:text-[#0f2744]"><Link to="/trips">View <span aria-hidden="true">→</span></Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}
