import { ArrowLeft, CalendarDays, MapPin } from "lucide-react"
import { Link, useParams } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"
import { previousTrips } from "@/features/home/homeData"

import { TripDayCard } from "./TripDayCard"
import { getTripDetails } from "./tripDetailsData"
import { userTrips } from "./myTripsData"

export function TripDetails() {
  const { tripId } = useParams({ from: "/trips/$tripId" })
  const trip = userTrips.find((item) => item.id === tripId) ?? previousTrips.find((item) => item.tripId === tripId)
  const details = getTripDetails(tripId) ?? (trip ? {
    title: trip.title,
    dates: trip.date,
    location: trip.location,
    totalSpent: 0,
    days: [{ label: "Day 1", date: trip.date.split("–")[0]?.trim() ?? trip.date, activities: [{ name: "Trip plans are being prepared", time: "All day", cost: null }] }],
  } : undefined)

  if (!trip || !details) {
    return <main className="min-h-svh bg-[#f8f7f4]"><HomeNavbar /><div className="mx-auto max-w-[600px] px-5 py-16 text-center"><h1 className="font-heading text-3xl text-[#0f2744]">Trip not found</h1><Button asChild className="mt-5 bg-[#0f2744]"><Link to="/trips">Back to My Trips</Link></Button></div></main>
  }

  const duration = "duration" in trip ? trip.duration : "10 days"

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search itinerary..." /></div>
      <div className="mx-auto max-w-[600px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <Button asChild variant="ghost" className="mb-5 h-auto px-0 text-xs text-[#7890a3] hover:bg-transparent hover:text-[#0d7a8a]"><Link to="/trips"><ArrowLeft className="size-3.5" aria-hidden="true" /> My Trips</Link></Button>
        <header className="mb-6 flex items-start justify-between gap-5"><div><h1 className="font-heading text-[31px] font-semibold leading-none text-[#0f2744]">{details.title}</h1><p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7890a3]"><MapPin className="size-3 text-[#e45e80]" aria-hidden="true" />{details.location}</p><p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#7890a3]"><CalendarDays className="size-3 text-[#7289dc]" aria-hidden="true" />{details.dates} · {duration}</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild type="button" variant="outline" className="h-8 rounded-lg border-[#d9e1ea] px-3 text-[10px] text-[#526984] hover:bg-[#f2f5f6]"><Link to="/trips/new">Edit Trip</Link></Button><Button asChild type="button" className="h-8 rounded-lg bg-[#0f2744] px-3 text-[10px] text-white hover:bg-[#183a61]"><Link to="/trips/new/build">View Itinerary</Link></Button></div></div><Card className="shrink-0 rounded-xl border-[#e1e7eb] bg-white py-0 text-center shadow-[0_2px_8px_rgba(15,39,68,.06)]"><CardContent className="px-4 py-3"><p className="text-[9px] uppercase tracking-wide text-[#7890a3]">Total spent</p><p className="mt-1 font-heading text-2xl font-semibold leading-none text-[#0f2744]">${details.totalSpent}</p></CardContent></Card></header>
        <div className="space-y-3">{details.days.map((day) => <TripDayCard key={day.label} day={day} />)}</div>
        <Card className="mt-4 rounded-xl border-0 bg-[#102b49] py-0 text-white shadow-[0_4px_12px_rgba(15,39,68,.16)]"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-semibold">Total Trip Expenses</p><p className="mt-1 text-[10px] text-[#b8cbd8]">3 days shown</p></div><p className="font-heading text-2xl font-semibold">${details.totalSpent}</p></CardContent></Card>
      </div>
    </main>
  )
}
