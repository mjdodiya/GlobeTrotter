import { useInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Compass, LoaderCircle, Plus, RefreshCw } from "lucide-react"

import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { EmptyState, RouteLoadingState } from "@/components/foundation/route-states"
import { TripSummaryCard } from "@/components/trips/trip-summary-card"
import { Button } from "@/components/ui/button"
import { uniqueById } from "@/lib/discovery-search"
import { tripListQueryOptions } from "@/lib/trip-api"
import { parseTripListSearch, tripListSearch } from "@/lib/trip-search"

export const Route = createFileRoute("/_authenticated/trips")({
  validateSearch: parseTripListSearch,
  component: TripsPage,
})

function TripsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const tripsQuery = useInfiniteQuery(tripListQueryOptions(search))
  const trips = uniqueById(tripsQuery.data?.pages ?? [])
  const scope = search.scope ?? "all"
  const status = search.status ?? "all"

  function updateFilters(nextScope: typeof scope, nextStatus: typeof status) {
    void navigate({ search: tripListSearch(nextScope, nextStatus) })
  }

  return (
    <div className="min-w-0 space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
            My Trips
          </h1>
          <p className="text-muted-foreground">Trips you own and Member Trips shared with you.</p>
        </div>
        <Button asChild>
          <Link to="/trips/new">
            <Plus aria-hidden="true" /> Create Trip
          </Link>
        </Button>
      </header>

      <section
        aria-label="Trip filters"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row"
      >
        <label className="grid gap-1 text-sm font-medium">
          Access
          <select
            aria-label="Access filter"
            className="h-9 min-w-44 rounded-md border border-input bg-transparent px-3 text-sm"
            onChange={(event) => updateFilters(event.currentTarget.value as typeof scope, status)}
            value={scope}
          >
            <option value="all">Owned and Member Trips</option>
            <option value="owned">Owned by me</option>
            <option value="member">Member Trips</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Trip Status
          <select
            aria-label="Trip Status filter"
            className="h-9 min-w-44 rounded-md border border-input bg-transparent px-3 text-sm"
            onChange={(event) => updateFilters(scope, event.currentTarget.value as typeof status)}
            value={status}
          >
            <option value="all">Every status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </section>

      {tripsQuery.isPending ? <RouteLoadingState label="Loading Trips" /> : null}
      {tripsQuery.isError && trips.length === 0 ? (
        <ProblemState
          onRetry={() => void tripsQuery.refetch()}
          problem={problemFromError(tripsQuery.error)}
        />
      ) : null}
      {!tripsQuery.isPending && !tripsQuery.isError && trips.length === 0 ? (
        <EmptyState
          title={scope === "all" && status === "all" ? "Start with a new Trip" : "No Trips match"}
          description={
            scope === "all" && status === "all"
              ? "Create a Trip from scratch, or explore destinations before deciding where to go."
              : "Change the filters, or create a new Trip when you are ready."
          }
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

      {trips.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripSummaryCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : null}

      {tripsQuery.isError && trips.length ? (
        <div className="flex flex-col items-center gap-2" role="alert">
          <p className="text-sm text-destructive">The next page couldn’t be loaded.</p>
          <Button onClick={() => void tripsQuery.fetchNextPage()} type="button" variant="outline">
            <RefreshCw aria-hidden="true" /> Retry page
          </Button>
        </div>
      ) : tripsQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            disabled={tripsQuery.isFetchingNextPage}
            onClick={() => void tripsQuery.fetchNextPage()}
            type="button"
            variant="outline"
          >
            {tripsQuery.isFetchingNextPage ? (
              <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
            ) : null}
            {tripsQuery.isFetchingNextPage ? "Loading…" : "Load more Trips"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
