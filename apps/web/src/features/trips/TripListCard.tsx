import { CalendarDays, MapPin } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import type { UserTrip } from "./myTripsData"

const statusStyles = {
  Ongoing: "bg-[#fff5df] text-[#bd7a13]",
  Upcoming: "bg-[#edf4ff] text-[#4b83d6]",
  Completed: "bg-[#e5f6ef] text-[#188260]",
}

export function TripListCard({ trip }: { trip: UserTrip }) {
  return (
    <Card className="rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)] transition-shadow hover:shadow-[0_7px_18px_rgba(15,39,68,.1)]">
      <CardContent className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center sm:p-4">
        <img src={trip.image} alt={trip.title} loading="lazy" className="h-36 w-full shrink-0 rounded-lg object-cover sm:size-[108px]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[20px] font-semibold leading-tight text-[#0f2744]">{trip.title}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7890a3]"><MapPin className="size-3 text-[#e45e80]" aria-hidden="true" />{trip.location}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#7890a3]"><CalendarDays className="size-3 text-[#7289dc]" aria-hidden="true" />{trip.date} · {trip.duration}</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[trip.status]}`}>{trip.status}</span>
          <Button asChild type="button" variant="outline" className="h-9 rounded-lg border-[#b9d8df] px-4 text-[11px] font-semibold text-[#0d7a8a] hover:bg-[#f1f8f8]"><Link to="/trips/$tripId" params={{ tripId: trip.id }}>View</Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}
