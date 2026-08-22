import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { PublicTripCopySeam } from "@/components/discovery/public-trip-copy-seam"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { ReadOnlyTrip } from "@/components/sharing/read-only-trip"
import { Button } from "@/components/ui/button"
import { publicTripQueryOptions } from "@/lib/discovery-api"

export const Route = createFileRoute("/_public/trips/$tripId")({
  component: PublicTripPage,
})

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

  return (
    <ReadOnlyTrip
      backControl={
        <Button asChild variant="ghost">
          <Link hash="public-trips" to="/">
            <ArrowLeft aria-hidden="true" /> Back to public Trips
          </Link>
        </Button>
      }
      copyControl={<PublicTripCopySeam tripId={tripQuery.data.id} />}
      sharingLabel="Public Trip"
      trip={tripQuery.data}
    />
  )
}
