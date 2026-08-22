import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Clock3, MapPin, Tags, WalletCards } from "lucide-react"

import { CatalogImage } from "@/components/discovery/catalog-image"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"
import { activityQueryOptions } from "@/lib/discovery-api"
import { formatDuration, formatMoney } from "@/lib/discovery-format"

export const Route = createFileRoute("/_public/activities_/$activityId")({
  component: ActivityDetailPage,
})

function ActivityDetailPage() {
  const { activityId } = Route.useParams()
  const activityQuery = useQuery(activityQueryOptions(activityId))

  if (activityQuery.isPending) return <RouteLoadingState label="Loading activity" />
  if (activityQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProblemState
          onRetry={() => void activityQuery.refetch()}
          problem={problemFromError(activityQuery.error)}
        />
      </div>
    )
  }

  const activity = activityQuery.data
  return (
    <article className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost">
        <Link to="/activities">
          <ArrowLeft aria-hidden="true" /> Back to activities
        </Link>
      </Button>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <CatalogImage
          alt={activity.name}
          className="aspect-[16/10] rounded-2xl border"
          imageUrl={activity.imageUrl}
        />
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {activity.category.name}
            </p>
            <h1
              data-route-heading
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {activity.name}
            </h1>
            <p className="text-pretty text-muted-foreground">
              {activity.description ??
                "More planning details for this Catalog Activity are coming soon."}
            </p>
          </header>
          <dl className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" /> City
              </dt>
              <dd className="mt-1 font-semibold">
                <Link
                  className="rounded-sm hover:underline hover:underline-offset-4"
                  params={{ cityId: activity.city.id }}
                  to="/cities/$cityId"
                >
                  {activity.city.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tags className="size-4" aria-hidden="true" /> Category
              </dt>
              <dd className="mt-1 font-semibold">{activity.category.name}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" aria-hidden="true" /> Reference duration
              </dt>
              <dd className="mt-1 font-semibold">
                {formatDuration(activity.defaultDurationMinutes)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletCards className="size-4" aria-hidden="true" /> Planning estimate
              </dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(activity.estimatedCost, activity.currency)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Costs and durations are catalog planning estimates, not live quotes or reservations.
          </p>
        </div>
      </div>
    </article>
  )
}
