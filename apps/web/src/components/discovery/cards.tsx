import { Link } from "@tanstack/react-router"
import { CalendarDays, Clock3, MapPin, Route, WalletCards } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogActivity, CatalogCity, PublicTripSummary } from "@/lib/discovery-api"
import {
  costIndexSummary,
  formatDateRange,
  formatDuration,
  formatMoney,
} from "@/lib/discovery-format"

import { CatalogImage } from "./catalog-image"
import { CitySaveButton } from "./city-save-button"

export function PublicTripCard({ trip }: { trip: PublicTripSummary }) {
  return (
    <Card className="h-full">
      <CatalogImage alt={trip.name} className="aspect-[16/9]" imageUrl={trip.coverImageUrl} />
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">Trip by {trip.owner.name}</p>
        <CardTitle>
          <Link
            className="rounded-sm text-lg hover:underline hover:underline-offset-4"
            params={{ tripId: trip.id }}
            to="/trips/$tripId"
          >
            {trip.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          {formatDateRange(trip.startDate, trip.endDate)}
        </span>
        <span className="flex items-center gap-2">
          <Route className="size-4" aria-hidden="true" />
          {trip.destinationCount} {trip.destinationCount === 1 ? "destination" : "destinations"}
        </span>
        <span className="flex items-center gap-2">
          <WalletCards className="size-4" aria-hidden="true" />
          {formatMoney(trip.estimatedCost, trip.baseCurrency)} estimated
        </span>
      </CardContent>
    </Card>
  )
}

export function CityCard({ city }: { city: CatalogCity }) {
  return (
    <Card className="h-full">
      <CatalogImage alt={city.name} className="aspect-[4/3]" imageUrl={city.imageUrl} />
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">
          {city.region ? `${city.region}, ` : ""}
          {city.country.name}
        </p>
        <CardTitle>
          <Link
            className="rounded-sm text-lg hover:underline hover:underline-offset-4"
            params={{ cityId: city.id }}
            to="/cities/$cityId"
          >
            {city.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="line-clamp-3 text-muted-foreground">
          {city.description ?? "Catalog details are still being prepared for this city."}
        </p>
        <p className="font-medium">{costIndexSummary(city.costIndex)}</p>
        <p className="text-xs text-muted-foreground">
          A relative planning guide; higher scores usually indicate higher local costs.
        </p>
      </CardContent>
      <CardFooter>
        <CitySaveButton cityId={city.id} cityName={city.name} />
      </CardFooter>
    </Card>
  )
}

export function ActivityCard({ activity }: { activity: CatalogActivity }) {
  return (
    <Card className="h-full">
      <CatalogImage alt={activity.name} className="aspect-[4/3]" imageUrl={activity.imageUrl} />
      <CardHeader>
        <p className="text-xs font-medium text-muted-foreground">{activity.category.name}</p>
        <CardTitle>
          <Link
            className="rounded-sm text-lg hover:underline hover:underline-offset-4"
            params={{ activityId: activity.id }}
            to="/activities/$activityId"
          >
            {activity.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <MapPin className="size-4" aria-hidden="true" /> {activity.city.name}
        </span>
        <span className="flex items-center gap-2">
          <Clock3 className="size-4" aria-hidden="true" />
          {formatDuration(activity.defaultDurationMinutes)}
        </span>
        <span className="flex items-center gap-2">
          <WalletCards className="size-4" aria-hidden="true" />
          {formatMoney(activity.estimatedCost, activity.currency)} estimated
        </span>
      </CardContent>
    </Card>
  )
}
