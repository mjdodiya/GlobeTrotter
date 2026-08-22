import { ArrowRight, Plus } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { DestinationCard } from "./DestinationCard"
import { destinations, previousTrips } from "./homeData"
import { HeroBanner, HeroSearch } from "./HeroBanner"
import { HomeNavbar } from "./HomeNavbar"
import { TripCard } from "./TripCard"

function SectionHeading({ title, action }: { title: string; action: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={title === "Previous Trips" ? "trips-heading" : "regional-heading"} className="font-heading text-[27px] font-semibold leading-none text-[#173452]">{title}</h2>
      <Button type="button" variant="ghost" className="h-auto gap-1 px-0 text-xs font-semibold text-[#0d7a8a] hover:bg-transparent hover:text-[#173452]">
        {action}<ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function HomePage() {
  return (
    <main className="min-h-svh bg-[#f7f8f6] text-[#173452]">
      <HomeNavbar />
      <HeroBanner />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch /></div>

      <div className="mx-auto max-w-[1440px] px-5 pb-28 pt-8 sm:px-8 lg:px-10">
        <section aria-labelledby="regional-heading">
          <SectionHeading title="Top Regional Selections" action="View all" />
          <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
            {destinations.map((destination) => <DestinationCard key={destination.name} destination={destination} />)}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="trips-heading">
          <SectionHeading title="Previous Trips" action="View all trips" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {previousTrips.map((trip) => <TripCard key={trip.title} trip={trip} />)}
          </div>
        </section>
      </div>

      <Button asChild type="button" className="fixed bottom-5 right-5 z-20 h-12 rounded-full bg-[#102b49] px-5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(16,43,73,.25)] hover:bg-[#1d4264] sm:bottom-7 sm:right-8">
        <Link to="/trips/new"><Plus className="size-4" aria-hidden="true" /> Plan a Trip</Link>
      </Button>
    </main>
  )
}
