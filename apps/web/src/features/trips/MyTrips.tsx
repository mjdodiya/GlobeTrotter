import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { TripListCard } from "./TripListCard"
import { type TripStatus, userTrips } from "./myTripsData"

const statusOrder: TripStatus[] = ["Ongoing", "Upcoming", "Completed"]
const statusColors: Record<TripStatus, string> = {
  Ongoing: "bg-[#f5b817]",
  Upcoming: "bg-[#5a9ded]",
  Completed: "bg-[#12bb8a]",
}

export function MyTrips() {
  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search trips..." /></div>
      <div className="mx-auto max-w-[600px] px-5 pb-24 pt-8 sm:px-8 lg:pt-10">
        <div className="mb-7">
          <div>
            <h1 className="font-heading text-[34px] font-semibold leading-none text-[#0f2744]">My Trips</h1>
            <p className="mt-2 text-xs text-[#526984] sm:text-sm">Your journeys, all in one place</p>
          </div>
        </div>

        <div className="space-y-7">
          {statusOrder.map((status) => {
            const trips = userTrips.filter((trip) => trip.status === status)
            return (
              <section key={status} aria-labelledby={`${status.toLowerCase()}-trips-heading`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={`size-2 rounded-full ${statusColors[status]}`} aria-hidden="true" />
                  <h2 id={`${status.toLowerCase()}-trips-heading`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#607991]">{status}</h2>
                </div>
                <div className="space-y-3">
                  {trips.map((trip) => <TripListCard key={trip.title} trip={trip} />)}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
