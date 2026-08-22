import { CalendarDays, MapPin } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Card, CardContent } from "@/components/ui/card"

import type { PreviousTrip } from "./homeData"

export function TripCard({ trip }: { trip: PreviousTrip }) {
  return (
    <Link to="/trips/$tripId" params={{ tripId: trip.tripId ?? trip.title.toLowerCase().replaceAll(" ", "-") }} aria-label={`View ${trip.title}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a8a]/40">
      <Card className="group overflow-hidden rounded-xl border-[#dfe6e9] bg-white py-0 shadow-[0_4px_12px_rgba(16,43,73,.06)] transition-shadow hover:shadow-[0_8px_22px_rgba(16,43,73,.12)]">
      <img src={trip.image} alt={trip.title} loading="lazy" className="h-[150px] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-[22px] font-semibold leading-none text-[#173452]">{trip.title}</h3>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-[#70879a]"><MapPin className="size-3 text-[#0d7a8a]" aria-hidden="true" />{trip.location}</p>
          </div>
          <span className="rounded-full bg-[#e5f6ef] px-2 py-1 text-[10px] font-semibold text-[#188260]">{trip.status}</span>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-[#70879a]"><CalendarDays className="size-3.5 text-[#0d7a8a]" aria-hidden="true" />{trip.date}</p>
      </CardContent>
      </Card>
    </Link>
  )
}
