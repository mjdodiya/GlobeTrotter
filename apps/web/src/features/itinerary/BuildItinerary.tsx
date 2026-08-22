import { Check, Save } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { ItinerarySectionList } from "./ItinerarySectionList"
import { initialSections, type ItinerarySection } from "./itineraryData"

export function BuildItinerary() {
  const navigate = useNavigate()
  const [sections, setSections] = useState<ItinerarySection[]>(initialSections)
  const [notice, setNotice] = useState("")
  const totalBudget = sections.reduce((total, section) => total + section.budget, 0)

  function updateSection(updated: ItinerarySection) {
    setSections((current) => current.map((section) => section.id === updated.id ? updated : section))
  }

  function addSection() {
    const number = sections.length + 1
    setSections((current) => [...current, { id: `section-${Date.now()}`, title: `Section ${number}: New Section`, description: "Add the details, dates, and budget for this part of your trip.", startDate: "2024-06-15", endDate: "2024-06-15", budget: 0 }])
  }

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch /></div>
      <div className="mx-auto max-w-[1000px] px-5 pb-12 pt-8 sm:px-8 lg:pt-10">
        <header className="mb-6 flex items-start justify-between gap-5">
          <div>
            <h1 className="font-heading text-[34px] font-semibold leading-none text-[#0f2744]">Build Your Itinerary</h1>
            <p className="mt-2 text-xs text-[#526984] sm:text-sm">Organize your trip into sections with budgets and timelines</p>
          </div>
          <div className="shrink-0 rounded-xl border border-[#e1e7eb] bg-white px-4 py-3 text-center shadow-[0_2px_8px_rgba(15,39,68,.06)]">
            <p className="text-[10px] text-[#7890a3]">Total Budget</p>
            <p className="mt-1 font-heading text-2xl font-semibold leading-none text-[#0f2744]">${totalBudget.toLocaleString()}</p>
          </div>
        </header>

        <ItinerarySectionList sections={sections} onChange={updateSection} onAdd={addSection} onRemove={(id) => setSections((current) => current.filter((section) => section.id !== id))} />

        <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          {notice ? <p role="status" className="mr-auto text-xs font-medium text-[#0d7a8a]">{notice}</p> : null}
          <Button type="button" variant="outline" onClick={() => setNotice("Draft saved locally.")} className="h-11 rounded-lg border-[#d9e1ea] bg-white px-6 text-xs font-semibold text-[#526984] hover:bg-[#f2f5f6]"><Save className="size-3.5" aria-hidden="true" /> Save Draft</Button>
          <Button type="button" onClick={() => setNotice("Itinerary saved locally.")} className="h-11 rounded-lg bg-[#0f2744] px-6 text-xs font-semibold text-white hover:bg-[#183a61]"><Check className="size-3.5" aria-hidden="true" /> Save Itinerary</Button>
        </div>
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/trips/new" })} className="mt-4 px-0 text-xs text-[#7890a3] hover:bg-transparent hover:text-[#0d7a8a]">Back to trip details</Button>
      </div>
    </main>
  )
}
