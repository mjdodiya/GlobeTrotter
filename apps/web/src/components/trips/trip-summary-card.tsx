import { Link } from "@tanstack/react-router"
import { CalendarDays, MapPinned, WalletCards } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateRange, formatMoney } from "@/lib/discovery-format"
import type { Dashboard, TripSummary } from "@/lib/trip-api"
import { tripAccessLabel, tripStatusLabel } from "@/lib/trip-presentation"

type DashboardTrip = Dashboard["upcomingTrips"][number]
type SummaryTrip = DashboardTrip | TripSummary

function hasAccess(trip: SummaryTrip): trip is TripSummary {
  return "access" in trip
}

export function TripStatusBadge({ status }: { status: SummaryTrip["status"] }) {
  return (
    <Badge variant={status === "ongoing" ? "default" : "secondary"}>
      {tripStatusLabel(status)}
    </Badge>
  )
}

export function TripSummaryCard({ trip }: { trip: SummaryTrip }) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <TripStatusBadge status={trip.status} />
          {hasAccess(trip) ? <Badge variant="outline">{tripAccessLabel(trip.access)}</Badge> : null}
          {"visibility" in trip ? (
            <Badge variant="outline">{trip.visibility === "public" ? "Public" : "Private"}</Badge>
          ) : null}
        </div>
        <CardTitle className="mt-2 min-w-0">
          <Link
            className="block truncate rounded-sm text-lg hover:underline hover:underline-offset-4"
            params={{ tripId: trip.id }}
            to="/trips/$tripId/manage"
          >
            {trip.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <dt className="sr-only">Travel Period</dt>
              <dd>{formatDateRange(trip.startDate, trip.endDate)}</dd>
              <dd className="text-xs">Ends on the departure date</dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPinned className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Destinations</dt>
            <dd>
              {trip.destinationCount} {trip.destinationCount === 1 ? "destination" : "destinations"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <WalletCards className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Estimated total</dt>
            <dd>{formatMoney(trip.estimatedCost, trip.baseCurrency)} estimated</dd>
          </div>
        </dl>
        {trip.budgetLimit !== null ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Budget Limit: {formatMoney(trip.budgetLimit, trip.baseCurrency)}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button asChild size="sm" variant="outline">
          <Link params={{ tripId: trip.id }} to="/trips/$tripId/manage">
            Open Trip
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
