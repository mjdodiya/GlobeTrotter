import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Clock3, Compass, MapPin } from "lucide-react"

import { CatalogImage } from "@/components/discovery/catalog-image"
import { CitySaveButton } from "@/components/discovery/city-save-button"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"
import { cityQueryOptions } from "@/lib/discovery-api"
import { costIndexSummary } from "@/lib/discovery-format"

export const Route = createFileRoute("/_public/cities_/$cityId")({
  component: CityDetailPage,
})

function CityDetailPage() {
  const { cityId } = Route.useParams()
  const cityQuery = useQuery(cityQueryOptions(cityId))

  if (cityQuery.isPending) return <RouteLoadingState label="Loading city" />
  if (cityQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProblemState
          onRetry={() => void cityQuery.refetch()}
          problem={problemFromError(cityQuery.error)}
        />
      </div>
    )
  }

  const city = cityQuery.data
  return (
    <article className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost">
        <Link to="/cities">
          <ArrowLeft aria-hidden="true" /> Back to cities
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <CatalogImage
          alt={city.name}
          className="aspect-[16/10] rounded-2xl border"
          imageUrl={city.imageUrl}
        />
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {city.region ? `${city.region}, ` : ""}
              {city.country.name}
            </p>
            <h1
              data-route-heading
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {city.name}
            </h1>
            <p className="text-pretty text-muted-foreground">
              {city.description ?? "More planning context for this Catalog City is coming soon."}
            </p>
          </header>
          <dl className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Compass className="size-4" aria-hidden="true" /> Planning costs
              </dt>
              <dd className="mt-1 font-semibold">{costIndexSummary(city.costIndex)}</dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Relative catalog guide only; higher scores generally indicate higher costs.
              </p>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" aria-hidden="true" /> Time zone
              </dt>
              <dd className="mt-1 font-semibold">{city.timezone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" /> Coordinates
              </dt>
              <dd className="mt-1 font-semibold">
                {city.latitude}, {city.longitude}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <CitySaveButton cityId={city.id} cityName={city.name} />
            <Button asChild>
              <Link to="/activities" search={{ cityId: city.id }}>
                Browse activities in {city.name}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
