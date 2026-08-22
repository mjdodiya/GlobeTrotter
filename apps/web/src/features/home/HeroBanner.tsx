import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { heroImage } from "./homeData"

export function HeroBanner() {
  return (
    <section className="relative isolate min-h-[270px] overflow-hidden sm:min-h-[330px]" aria-labelledby="hero-heading">
      <img src={heroImage} alt="A road through a red rock canyon" className="absolute inset-0 size-full object-cover object-center" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,31,53,.9),rgba(14,44,65,.42)_58%,rgba(14,44,65,.15))]" />
      <div className="relative mx-auto flex min-h-[270px] max-w-[1440px] items-end px-5 pb-9 sm:min-h-[330px] sm:px-8 sm:pb-12 lg:px-10">
        <div className="max-w-xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f3c969]">Your next chapter starts here</p>
          <h1 id="hero-heading" className="font-heading text-5xl font-semibold leading-[.95] tracking-tight text-white sm:text-6xl">
            Where to next?
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#e3e9ed] sm:text-base">
            Discover places that stay with you. Plan the details, keep the memories.
          </p>
        </div>

        <Button type="button" size="icon-lg" className="absolute bottom-9 right-5 rounded-full bg-[#f3c969] text-[#102b49] hover:bg-[#ffe09a] sm:bottom-12 sm:right-8 lg:right-10" aria-label="Search destinations">
          <Search aria-hidden="true" />
        </Button>
      </div>
    </section>
  )
}

export function HeroSearch() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:px-10">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#7890a3]" aria-hidden="true" />
        <Input placeholder="Search destinations, activities, hotels..." aria-label="Search destinations, activities, hotels" className="h-11 rounded-lg border-[#d7e0e5] bg-white pl-11 text-xs shadow-[0_2px_8px_rgba(16,43,73,.04)] placeholder:text-[#91a2b1]" />
      </div>
      <div className="grid grid-cols-3 gap-2 lg:flex">
        {['Group by', 'Filter', 'Sort by'].map((label) => (
          <Button key={label} type="button" variant="outline" className="h-11 rounded-lg border-[#d7e0e5] bg-white px-3 text-xs font-medium text-[#3e5870] hover:border-[#7da2ad] hover:bg-[#f5f8f8]">
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
