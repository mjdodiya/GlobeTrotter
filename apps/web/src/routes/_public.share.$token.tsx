import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Link2Off } from "lucide-react"

import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { ReadOnlyTrip } from "@/components/sharing/read-only-trip"
import { TripCopyControl } from "@/components/sharing/trip-copy-control"
import { Button } from "@/components/ui/button"
import { ApiProblemError } from "@/lib/http"
import { linkSharedTripQueryOptions } from "@/lib/sharing-api"

export const Route = createFileRoute("/_public/share/$token")({
  component: LinkSharedTripPage,
})

function SharedTripUnavailable() {
  return (
    <section
      aria-labelledby="shared-trip-unavailable-heading"
      className="mx-auto my-12 w-[calc(100%-2rem)] max-w-2xl rounded-2xl border bg-card p-6 sm:p-8"
      role="alert"
    >
      <Link2Off className="size-7 text-muted-foreground" aria-hidden="true" />
      <h1
        className="mt-4 text-2xl font-semibold"
        data-route-heading
        id="shared-trip-unavailable-heading"
        tabIndex={-1}
      >
        This shared Trip is unavailable
      </h1>
      <p className="mt-2 text-muted-foreground">
        The Share Link may be expired, revoked, or incorrect. Ask the person who shared it for a new
        link.
      </p>
      <Button asChild className="mt-5" variant="outline">
        <Link to="/">Explore GlobeTrotter</Link>
      </Button>
    </section>
  )
}

function LinkSharedTripPage() {
  const { token } = Route.useParams()
  const tripQuery = useQuery(linkSharedTripQueryOptions(token))

  if (tripQuery.isPending) return <RouteLoadingState label="Opening shared Trip" />
  if (tripQuery.isError) {
    if (tripQuery.error instanceof ApiProblemError && tripQuery.error.problem.status === 404) {
      return <SharedTripUnavailable />
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProblemState
          onRetry={() => void tripQuery.refetch()}
          problem={problemFromError(tripQuery.error)}
        />
      </div>
    )
  }

  return (
    <ReadOnlyTrip
      backControl={
        <Button asChild variant="ghost">
          <Link to="/">
            <ArrowLeft aria-hidden="true" /> Back to GlobeTrotter
          </Link>
        </Button>
      }
      copyControl={<TripCopyControl source={{ kind: "link", token }} />}
      sharingLabel="Shared Trip"
      trip={tripQuery.data}
    />
  )
}
