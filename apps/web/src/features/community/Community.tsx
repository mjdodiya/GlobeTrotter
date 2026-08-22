import { Heart, MessageCircle, PenLine, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HeroSearch } from "@/features/home/HeroBanner"
import { HomeNavbar } from "@/features/home/HomeNavbar"

import { communityPosts } from "./communityData"

export function Community() {
  const [query, setQuery] = useState("")
  const posts = useMemo(() => communityPosts.filter((post) => `${post.title} ${post.location} ${post.excerpt}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <main className="min-h-svh bg-[#f8f7f4] text-[#0f2744]">
      <HomeNavbar />
      <div className="border-b border-[#e6ebec] bg-white"><HeroSearch placeholder="Search stories and destinations..." /></div>
      <div className="mx-auto max-w-[1060px] px-5 pb-16 pt-8 sm:px-8 lg:pt-10">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#0d7a8a]">Travel together</p><h1 className="font-heading text-[38px] font-semibold leading-none text-[#0f2744]">Community</h1><p className="mt-2 text-sm text-[#526984]">Find ideas, honest advice, and stories from fellow travelers.</p></div>
          <Button type="button" className="h-10 rounded-lg bg-[#0f2744] px-4 text-xs font-semibold text-white hover:bg-[#183a61]"><PenLine className="size-3.5" aria-hidden="true" /> Share a story</Button>
        </header>
        <div className="relative mb-6 max-w-md"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7890a3]" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the community" aria-label="Search the community" className="h-10 rounded-lg border-[#d9e1ea] bg-white pl-10 text-xs" /></div>
        {posts.length ? <div className="grid gap-5 md:grid-cols-3">{posts.map((post) => <Card key={post.id} className="overflow-hidden rounded-xl border-[#e1e7eb] bg-white py-0 shadow-[0_2px_8px_rgba(15,39,68,.06)]"><img src={post.image} alt={post.title} className="h-44 w-full object-cover" /><CardContent className="p-4"><div className="flex items-center gap-2"><Avatar className="size-7 bg-[#f0d3a3]"><AvatarFallback className="bg-[#f0d3a3] text-[10px] text-[#0f2744]">{post.initials}</AvatarFallback></Avatar><span className="text-[11px] font-semibold text-[#526984]">{post.author}</span></div><h2 className="mt-4 font-heading text-[22px] font-semibold leading-tight text-[#0f2744]">{post.title}</h2><p className="mt-1 text-[11px] font-medium text-[#0d7a8a]">{post.location}</p><p className="mt-3 text-xs leading-5 text-[#607991]">{post.excerpt}</p><div className="mt-4 flex items-center gap-4 text-[11px] text-[#7890a3]"><span className="flex items-center gap-1"><Heart className="size-3.5" aria-hidden="true" />{post.likes}</span><span className="flex items-center gap-1"><MessageCircle className="size-3.5" aria-hidden="true" />{post.comments}</span></div></CardContent></Card>)}</div> : <Card className="rounded-xl border-dashed border-[#c8d6de] bg-white p-10 text-center"><p className="font-heading text-2xl text-[#0f2744]">No stories found</p><p className="mt-2 text-sm text-[#7890a3]">Try a different destination or keyword.</p></Card>}
      </div>
    </main>
  )
}
