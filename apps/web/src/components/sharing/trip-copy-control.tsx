import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Copy, ExternalLink, RefreshCw } from "lucide-react"

import { problemFromError } from "@/components/foundation/problem-state"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { sessionQueryOptions } from "@/lib/session"
import { signInHref } from "@/lib/session-routing"
import { copyLinkSharedTrip, copyTrip } from "@/lib/sharing-api"

type CopySource =
  | { kind: "link"; token: string }
  | { kind: "participant" | "public"; tripId: string }

export function TripCopyControl({ source }: { source: CopySource }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery(sessionQueryOptions())
  const mutation = useMutation({
    mutationFn: () =>
      source.kind === "link" ? copyLinkSharedTrip(source.token) : copyTrip(source.tripId),
    onSuccess: async (copy) => {
      await Promise.all([
        queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tripLists() }),
      ])
      await navigate({
        to: "/trips/$tripId/manage",
        params: { tripId: copy.id },
      })
    },
  })
  const problem = mutation.isError ? problemFromError(mutation.error) : null
  const currentDestination = `${window.location.pathname}${window.location.search}${window.location.hash}`

  return (
    <section aria-labelledby="copy-trip-heading" className="rounded-2xl border bg-muted/30 p-5">
      <h2 id="copy-trip-heading" className="font-semibold">
        Make this Trip your own
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This creates an independent private Trip. Membership, Share Links, publication, and the
        cover image are not carried over, and future source edits will not update your copy.
      </p>

      {session.data ? (
        <Button
          className="mt-4"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          type="button"
          variant="outline"
        >
          <Copy aria-hidden="true" /> {mutation.isPending ? "Copying Trip…" : "Copy this Trip"}
        </Button>
      ) : source.kind === "link" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link rel="noopener noreferrer" target="_blank" to="/sign-in">
              Sign in in a new tab <ExternalLink aria-hidden="true" />
            </Link>
          </Button>
          <Button
            disabled={session.isFetching}
            onClick={() => void session.refetch()}
            type="button"
            variant="ghost"
          >
            <RefreshCw aria-hidden="true" /> I’ve signed in
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            This keeps the private Share Link out of the sign-in address. Return here after signing
            in, then check again.
          </p>
        </div>
      ) : (
        <Button asChild className="mt-4" variant="outline">
          <a href={signInHref(currentDestination)}>Sign in to copy this Trip</a>
        </Button>
      )}

      {problem ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {problem.title}: {problem.detail}
        </p>
      ) : null}
    </section>
  )
}
