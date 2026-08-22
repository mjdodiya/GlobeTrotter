import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, CalendarDays, MapPinned, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"

const features = [
  {
    icon: MapPinned,
    title: "Build the route",
    description: "Organize every Stop without losing the shape of the Trip.",
  },
  {
    icon: CalendarDays,
    title: "See the whole plan",
    description: "Keep dates, travel time, and Planning Gaps visible.",
  },
  {
    icon: WalletCards,
    title: "Plan the budget",
    description: "Understand estimates in one consistent Base Currency.",
  },
] as const

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
})

function LandingPage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-8 lg:py-32">
        <div className="min-w-0 space-y-6">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            One thoughtful plan, every stop
          </p>
          <h1
            data-route-heading
            tabIndex={-1}
            className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Travel plans that stay clear from first idea to final day.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
            Shape multi-city Trips, understand your budget, and keep every participant working from
            the latest plan.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/sign-in">
                Start planning <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 rounded-3xl border bg-muted/40 p-4 shadow-sm sm:grid-cols-2 sm:p-6 lg:grid-cols-1">
          {features.map(({ description, icon: Icon, title }) => (
            <article key={title} className="min-w-0 rounded-2xl border bg-card p-5">
              <Icon className="mb-4 size-5" aria-hidden="true" />
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="border-t bg-muted/20 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            A calm foundation for complex Trips
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            GlobeTrotter keeps navigation, access, feedback, and concurrent edits predictable on
            every screen size.
          </p>
        </div>
      </section>
    </>
  )
}
