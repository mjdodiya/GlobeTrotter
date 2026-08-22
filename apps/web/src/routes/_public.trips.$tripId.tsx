import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Route as RouteIcon,
  UserRound,
  WalletCards,
} from "lucide-react"

import { CatalogImage } from "@/components/discovery/catalog-image"
import { PublicTripCopySeam } from "@/components/discovery/public-trip-copy-seam"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"
import { publicTripQueryOptions } from "@/lib/discovery-api"
import { formatDateRange, formatDuration, formatMoney } from "@/lib/discovery-format"

export const Route = createFileRoute("/_public/trips/$tripId")({
  component: PublicTripPage,
})

function formatInstant(value: string | null, timezone: string): string {
  if (!value) return "Time unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value))
}

function PublicTripPage() {
  const { tripId } = Route.useParams()
  const tripQuery = useQuery(publicTripQueryOptions(tripId))

  if (tripQuery.isPending) return <RouteLoadingState label="Loading public Trip" />
  if (tripQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProblemState
          onRetry={() => void tripQuery.refetch()}
          problem={problemFromError(tripQuery.error)}
        />
      </div>
    )
  }

  const trip = tripQuery.data
  const stopById = new Map(trip.stops.map((stop) => [stop.id, stop]))

  return (
    <article className="mx-auto w-full max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost">
        <Link hash="public-trips" to="/">
          <ArrowLeft aria-hidden="true" /> Back to public Trips
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <CatalogImage
          alt={trip.name}
          className="aspect-[16/10] rounded-2xl border"
          imageUrl={trip.coverImageUrl}
        />
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <UserRound className="size-4" aria-hidden="true" /> Public Trip by {trip.owner.name}
            </p>
            <h1
              data-route-heading
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {trip.name}
            </h1>
            <p className="text-pretty text-muted-foreground">
              {trip.description ?? "This traveler has not added a public Trip description."}
            </p>
          </header>
          <dl className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden="true" /> Travel period
              </dt>
              <dd className="mt-1 font-semibold">
                {formatDateRange(trip.startDate, trip.endDate)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <RouteIcon className="size-4" aria-hidden="true" /> Destinations
              </dt>
              <dd className="mt-1 font-semibold">{trip.destinationCount}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletCards className="size-4" aria-hidden="true" /> Estimated total
              </dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(trip.estimatedCost, trip.baseCurrency)}
              </dd>
            </div>
          </dl>
          <PublicTripCopySeam tripId={trip.id} />
        </div>
      </div>

      <section aria-labelledby="trip-itinerary-heading" className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Read-only itinerary
          </p>
          <h2 id="trip-itinerary-heading" className="text-2xl font-semibold">
            Stops and plans
          </h2>
        </header>
        {trip.stops.length ? (
          <ol className="grid gap-5">
            {trip.stops.map((stop, index) => (
              <li className="rounded-2xl border bg-card p-5 sm:p-6" key={stop.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Stop {index + 1}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">
                      <Link
                        className="rounded-sm hover:underline hover:underline-offset-4"
                        params={{ cityId: stop.city.id }}
                        to="/cities/$cityId"
                      >
                        {stop.city.name}
                      </Link>
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {formatDateRange(stop.startDate, stop.endDate)}
                  </p>
                </div>
                {stop.items.length ? (
                  <ul className="mt-5 grid gap-3 md:grid-cols-2">
                    {stop.items.map((item) => (
                      <li className="rounded-xl bg-muted/40 p-4" key={item.id}>
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {item.kind}
                        </p>
                        <h4 className="mt-1 font-semibold">{item.title}</h4>
                        {item.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {item.scheduledDate}
                            {item.startTime ? ` at ${item.startTime.slice(0, 5)}` : ""}
                          </span>
                          {item.durationMinutes ? (
                            <span className="flex items-center gap-1">
                              <Clock3 className="size-3.5" aria-hidden="true" />
                              {formatDuration(item.durationMinutes)}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <WalletCards className="size-3.5" aria-hidden="true" />
                            {formatMoney(item.estimatedCost, trip.baseCurrency)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                    No public itinerary items have been added to this stop.
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            This public Trip does not have any stops yet.
          </p>
        )}
      </section>

      {trip.legs.length ? (
        <section aria-labelledby="travel-legs-heading" className="space-y-5">
          <h2 id="travel-legs-heading" className="text-2xl font-semibold">
            Travel Legs
          </h2>
          <ol className="grid gap-4 md:grid-cols-2">
            {trip.legs.map((leg) => {
              const from = stopById.get(leg.fromStopId)
              const to = stopById.get(leg.toStopId)
              return (
                <li className="rounded-2xl border bg-card p-5" key={leg.id}>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {leg.mode}
                  </p>
                  <h3 className="mt-1 font-semibold">{leg.title}</h3>
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <MapPin className="size-4" aria-hidden="true" />
                    {from?.city.name ?? "Origin"} → {to?.city.name ?? "Destination"}
                  </p>
                  <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div>
                      <dt className="sr-only">Departure</dt>
                      <dd>{formatInstant(leg.departureAt, leg.departureTimezone)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Arrival</dt>
                      <dd>{formatInstant(leg.arrivalAt, leg.arrivalTimezone)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Estimated cost</dt>
                      <dd>{formatMoney(leg.estimatedCost, trip.baseCurrency)} estimated</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ol>
        </section>
      ) : null}

      {trip.warnings.length ? (
        <section aria-labelledby="planning-warnings-heading" className="rounded-2xl border p-5">
          <h2 id="planning-warnings-heading" className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-5" aria-hidden="true" /> Planning Gaps
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {trip.warnings.map((warning) => (
              <li key={`${warning.code}-${warning.stopIds.join("-")}`}>{warning.message}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
