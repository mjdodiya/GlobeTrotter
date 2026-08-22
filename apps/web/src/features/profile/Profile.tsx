import type { ReactNode } from "react"
import { Check, MapPin, Pencil } from "lucide-react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { ProfileTripCard } from "./ProfileTripCard"
import { plannedTrips, previousTrips, profileStats } from "./profileData"

export function Profile() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search profile..." /></div>
      <div className="mx-auto max-w-[630px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <Card className="rounded-xl border-[#e1e7eb] bg-white shadow-[0_2px_8px_rgba(15,39,68,.06)]">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative shrink-0 self-center sm:self-start">
                <Avatar className="size-[76px] border-2 border-[#0d7a8a] bg-[#123b58]"><AvatarFallback className="bg-[#123b58] font-heading text-2xl font-semibold text-white">AS</AvatarFallback></Avatar>
                <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#0bc695] text-white"><Check className="size-3" aria-hidden="true" /></span>
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h1 className="font-heading text-[28px] font-semibold leading-none text-[#0f2744]">Alexandra Smith</h1><p className="mt-1 text-[11px] text-[#526984]">alex.smith@example.com · +1 234 567 8900</p><p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-[#7890a3] sm:justify-start"><MapPin className="size-3 text-[#e45e80]" aria-hidden="true" />New York, United States</p></div><Button type="button" variant="outline" onClick={() => setIsEditing((editing) => !editing)} className="h-8 rounded-lg border-[#d9e1ea] px-3 text-[11px] text-[#526984] hover:bg-[#f2f5f6]"><Pencil className="size-3" aria-hidden="true" />{isEditing ? "Done" : "Edit Profile"}</Button></div>
                {isEditing ? <p className="mt-3 rounded-lg bg-[#f4f7fa] px-3 py-2 text-[11px] text-[#526984]" role="status">Profile editing is available locally for now.</p> : null}
                <div className="mt-4 grid grid-cols-4 border-t border-[#e8edf0] pt-4">{profileStats.map((stat) => <div key={stat.label} className="border-r border-[#e8edf0] px-2 last:border-0"><p className="font-heading text-xl font-semibold leading-none text-[#0f2744]">{stat.value}</p><p className="mt-1 text-[9px] leading-3 text-[#7890a3]">{stat.label}</p></div>)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ProfileSectionHeading title="Preplanned Trips" action={<Link to="/trips/new">+ Plan new trip</Link>} />
        <div className="grid gap-4 sm:grid-cols-3">{plannedTrips.map((trip) => <ProfileTripCard key={trip.title} trip={trip} />)}</div>

        <ProfileSectionHeading title="Previous Trips" action={<Link to="/trips">View all →</Link>} />
        <div className="grid gap-4 sm:grid-cols-3">{previousTrips.map((trip) => <Card key={trip.title} className="overflow-hidden rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]"><img src={trip.image} alt={trip.title} loading="lazy" className="h-32 w-full object-cover" /><CardContent className="p-3"><h3 className="font-heading text-[18px] font-semibold leading-tight text-[#0f2744]">{trip.title}</h3><p className="mt-1 text-[11px] text-[#7890a3]">{trip.location}</p><Button asChild type="button" variant="outline" className="mt-3 h-7 rounded-lg border-[#b9d8df] px-3 text-[10px] text-[#0d7a8a]"><Link to="/trips">View</Link></Button></CardContent></Card>)}</div>
      </div>
    </main>
  )
}

function ProfileSectionHeading({ title, action }: { title: string; action: ReactNode }) {
  return <div className="mb-4 mt-7 flex items-center justify-between gap-3"><h2 className="font-heading text-[23px] font-semibold leading-none text-[#0f2744]">{title}</h2><Button asChild type="button" variant="ghost" className="h-auto px-0 text-[11px] font-semibold text-[#0d7a8a] hover:bg-transparent hover:text-[#0f2744]">{action}</Button></div>
}
