import { Clock3, Compass, MapPin, Search, SlidersHorizontal, Star } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { activities } from "./activityData"

export function ActivitySearch() {
  const [query, setQuery] = useState("Paragliding")
  const [sort, setSort] = useState<"rating" | "price">("rating")
  const results = useMemo(() => activities.filter((activity) => `${activity.title} ${activity.location} ${activity.category}`.toLowerCase().includes(query.toLowerCase())).toSorted((a, b) => sort === "price" ? a.price - b.price : b.rating - a.rating), [query, sort])

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search activities..." /></div>
      <div className="mx-auto max-w-[700px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#0d7a8a]">Find your next experience</p><h1 className="font-heading text-[34px] font-semibold leading-none text-[#0f2744]">Activity Search</h1><p className="mt-2 text-xs text-[#526984]">{results.length} results for <strong className="text-[#0f2744]">“{query || "all activities"}”</strong></p></div><Button type="button" variant="outline" onClick={() => setSort((current) => current === "rating" ? "price" : "rating")} className="h-9 rounded-lg border-[#d9e1ea] bg-white px-3 text-xs text-[#526984] hover:bg-[#f2f5f6]"><SlidersHorizontal className="size-3.5" aria-hidden="true" /> Sort: {sort === "rating" ? "Top rated" : "Price"}</Button></header>
        <div className="relative mb-5"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7890a3]" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activities" aria-label="Search activities" className="h-10 rounded-lg border-[#d9e1ea] bg-white pl-10 text-xs" /></div>
        <div className="space-y-3">{results.map((activity) => <Card key={activity.id} className="rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]"><CardContent className="flex flex-col gap-4 p-3 sm:flex-row sm:items-center sm:p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f1f5f5] text-[#0d7a8a]"><Compass className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-[#0f2744]">{activity.title}</h2><p className="mt-1 flex items-center gap-1 text-[11px] text-[#7890a3]"><MapPin className="size-3 text-[#e45e80]" aria-hidden="true" />{activity.location}<span aria-hidden="true">·</span><Clock3 className="size-3" aria-hidden="true" />{activity.duration}</p></div><div className="flex items-center justify-between gap-5 sm:justify-end"><div className="text-right"><p className="text-sm font-semibold text-[#0f2744]">${activity.price}</p><p className="text-[10px] text-[#7890a3]">per person</p></div><div className="min-w-14 text-right"><p className="flex items-center justify-end gap-1 text-xs font-semibold text-[#d8881d]"><Star className="size-3 fill-current" aria-hidden="true" />{activity.rating}</p><p className="text-[10px] text-[#7890a3]">{activity.reviews} reviews</p></div></div></CardContent></Card>)}</div>
        {!results.length ? <Card className="rounded-xl border-dashed border-[#c8d6de] bg-white p-10 text-center"><p className="font-heading text-2xl">No activities found</p><p className="mt-2 text-sm text-[#7890a3]">Try another search.</p></Card> : null}
      </div>
    </main>
  )
}
