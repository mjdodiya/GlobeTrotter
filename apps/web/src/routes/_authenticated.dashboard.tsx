import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowRight, Compass, MapPinned, Plus, WalletCards } from "lucide-react"

import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { EmptyState, RouteLoadingState } from "@/components/foundation/route-states"
import { TripSummaryCard } from "@/components/trips/trip-summary-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/discovery-format"
import { dashboardQueryOptions } from "@/lib/trip-api"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  const dashboardQuery = useQuery(dashboardQueryOptions())

  if (dashboardQuery.isPending) return <RouteLoadingState label="Loading dashboard" />
  if (dashboardQuery.isError) {
    return (
      <ProblemState
        onRetry={() => void dashboardQuery.refetch()}
        problem={problemFromError(dashboardQuery.error)}
      />
    )
  }

  const dashboard = dashboardQuery.data
  const hasTrips = dashboard.upcomingTrips.length > 0 || dashboard.recentTrips.length > 0

  return (
    <div className="min-w-0 space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
          <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
            {session.user.name || "Traveler"}’s dashboard
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Keep upcoming plans, recent memories, destinations, and budgets in view.
          </p>
        </div>
        <Button asChild>
          <Link to="/trips/new">
            <Plus aria-hidden="true" /> Create Trip
          </Link>
        </Button>
      </header>

      {!hasTrips ? (
        <EmptyState
          title="No Trips to show yet"
          description="Create your first Trip, or explore the catalog for ideas worth planning."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/trips/new">
                  <Plus aria-hidden="true" /> Create Trip
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cities">
                  <Compass aria-hidden="true" /> Discover cities
                </Link>
              </Button>
            </div>
          }
        />
      ) : null}

      {dashboard.upcomingTrips.length ? (
        <DashboardTripSection
          description="Trips whose first travel day is still ahead."
          id="upcoming-trips"
          title="Upcoming Trips"
          trips={dashboard.upcomingTrips}
        />
      ) : null}

      {dashboard.recentTrips.length ? (
        <DashboardTripSection
          description="Completed Trips, ordered by their departure date."
          id="recent-trips"
          title="Recent Trips"
          trips={dashboard.recentTrips}
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="popular-cities-heading" className="space-y-4">
          <header className="space-y-1">
            <h2 id="popular-cities-heading" className="text-xl font-semibold">
              Popular cities in your Trips
            </h2>
            <p className="text-sm text-muted-foreground">
              Distinct Trips that include each Catalog City.
            </p>
          </header>
          {dashboard.popularCities.length ? (
            <Card>
              <CardContent>
                <ol className="divide-y">
                  {dashboard.popularCities.map((city, index) => (
                    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={city.id}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                        {index + 1}
                      </span>
                      <MapPinned
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Link
                        className="min-w-0 flex-1 truncate rounded-sm font-medium hover:underline hover:underline-offset-4"
                        params={{ cityId: city.id! }}
                        to="/cities/$cityId"
                      >
                        {city.name}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {city.tripCount} {city.tripCount === 1 ? "Trip" : "Trips"}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Add Stops to Trips to see frequently planned cities here.
            </p>
          )}
        </section>

        <section aria-labelledby="budget-highlights-heading" className="space-y-4">
          <header className="space-y-1">
            <h2 id="budget-highlights-heading" className="text-xl font-semibold">
              Budget highlights
            </h2>
            <p className="text-sm text-muted-foreground">
              Each Base Currency stays separate—values are never combined across currencies.
            </p>
          </header>
          {dashboard.budgetHighlights.currencies.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {dashboard.budgetHighlights.currencies.map((highlight) => (
                <Card key={highlight.currency}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{highlight.currency}</CardTitle>
                      <WalletCards className="size-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Estimated total</dt>
                        <dd className="text-lg font-semibold">
                          {formatMoney(highlight.totalEstimatedCost, highlight.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Budget Limits</dt>
                        <dd className="font-medium">
                          {formatMoney(highlight.totalBudget, highlight.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="sr-only">Trip count</dt>
                        <dd className="text-xs text-muted-foreground">
                          Across {highlight.tripCount}{" "}
                          {highlight.tripCount === 1 ? "Trip" : "Trips"}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              Budget highlights appear after a Trip is created.
            </p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border bg-muted/25 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Need a fresh idea?</h2>
          <p className="text-sm text-muted-foreground">
            Explore public Trips, Catalog Cities, and Catalog Activities.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">
            Open discovery <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </div>
  )
}

function DashboardTripSection({
  description,
  id,
  title,
  trips,
}: {
  description: string
  id: string
  title: string
  trips: Parameters<typeof TripSummaryCard>[0]["trip"][]
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4">
      <header className="space-y-1">
        <h2 id={`${id}-heading`} className="text-xl font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <TripSummaryCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  )
}
