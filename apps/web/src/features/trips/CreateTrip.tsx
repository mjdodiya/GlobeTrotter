import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { TripDetailsForm, type TripDetails } from "./TripDetailsForm"
import { TripSuggestions } from "./TripSuggestions"

export function CreateTrip() {
  const navigate = useNavigate()
  const [details, setDetails] = useState<TripDetails>({ name: "", place: "", startDate: "", endDate: "" })

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch /></div>
      <div className="mx-auto max-w-[1000px] px-5 pb-12 pt-8 sm:px-8 lg:pt-10">
        <header className="mb-6">
          <h1 className="font-heading text-[34px] font-semibold leading-none text-[#0f2744]">Plan a New Trip</h1>
          <p className="mt-2 text-xs text-[#526984] sm:text-sm">Set your destination and travel window to get tailored suggestions</p>
        </header>
        <TripDetailsForm details={details} onChange={setDetails} />
        <div className="mt-7"><TripSuggestions /></div>
        <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })} className="h-11 rounded-lg border-[#d9e1ea] bg-white px-7 text-xs font-semibold text-[#526984] hover:bg-[#f2f5f6]">Cancel</Button>
          <Button asChild type="button" className="h-11 rounded-lg bg-[#0f2744] px-7 text-xs font-semibold text-white hover:bg-[#183a61]"><Link to="/trips/new/build">Build Itinerary <span aria-hidden="true">→</span></Link></Button>
        </div>
      </div>
    </main>
  )
}
