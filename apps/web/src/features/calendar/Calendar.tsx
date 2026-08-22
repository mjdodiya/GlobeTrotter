import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

const days = Array.from({ length: 30 }, (_, index) => index + 1)
const events: Record<number, { title: string; place: string; tone: string }> = { 5: { title: "Tokyo Autumn Adventure", place: "Tokyo, Japan", tone: "bg-[#e5f1ff] text-[#3978bd]" }, 15: { title: "Paris Getaway", place: "Paris, France", tone: "bg-[#fff2d9] text-[#bd7a13]" }, 22: { title: "Paris Getaway", place: "Louvre Museum", tone: "bg-[#e5f6ef] text-[#188260]" } }

export function Calendar() {
  const [month, setMonth] = useState("June 2024")
  return <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]"><HomeNavbar /><div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search calendar..." /></div><div className="mx-auto max-w-[1060px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10"><header className="mb-7 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#0d7a8a]">Your travel rhythm</p><h1 className="font-heading text-[38px] font-semibold leading-none">Calendar</h1><p className="mt-2 text-sm text-[#526984]">Keep every departure, stay, and experience in view.</p></div><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" onClick={() => setMonth("May 2024")} aria-label="Previous month" className="rounded-lg border-[#d9e1ea] bg-white"><ChevronLeft /></Button><span className="min-w-24 text-center text-sm font-semibold text-[#526984]">{month}</span><Button type="button" variant="outline" size="icon" onClick={() => setMonth("July 2024")} aria-label="Next month" className="rounded-lg border-[#d9e1ea] bg-white"><ChevronRight /></Button></div></header><Card className="rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]"><CardContent className="p-4 sm:p-6"><div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[#8aa0b0]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day} className="py-2">{day}</span>)}{days.map((day) => <div key={day} className={`min-h-20 rounded-lg border border-transparent p-2 text-left text-xs text-[#526984] ${events[day] ? "bg-[#fbfcfc]" : "hover:border-[#d9e1ea]"}`}><span className="font-semibold">{day}</span>{events[day] ? <div className={`mt-2 rounded-md px-2 py-1.5 text-[10px] font-semibold leading-tight ${events[day].tone}`}><span className="block truncate">{events[day].title}</span><span className="mt-1 flex items-center gap-0.5 truncate font-normal"><MapPin className="size-2.5" aria-hidden="true" />{events[day].place}</span></div> : null}</div>)}</div></CardContent></Card></div></main>
}
