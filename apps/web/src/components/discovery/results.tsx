import { LoaderCircle, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

import { EmptyState, RouteLoadingState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"

export function InitialResultsState({
  emptyDescription,
  emptyTitle,
  error,
  isPending,
  itemCount,
  onRetry,
}: {
  emptyDescription: string
  emptyTitle: string
  error: Error | null
  isPending: boolean
  itemCount: number
  onRetry: () => void
}) {
  if (isPending) return <RouteLoadingState label="Loading results" />
  if (error && itemCount === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={onRetry} type="button">
            <RefreshCw aria-hidden="true" /> Try again
          </Button>
        }
        description="The catalog could not be loaded. Check your connection and retry."
        title="Results unavailable"
      />
    )
  }
  if (itemCount === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />
  }
  return null
}

export function ResultsFooter({
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  error: Error | null
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 text-center" role="alert">
        <p className="text-sm text-destructive">The next page couldn’t be loaded.</p>
        <Button onClick={onLoadMore} type="button" variant="outline">
          <RefreshCw aria-hidden="true" /> Retry page
        </Button>
      </div>
    )
  }
  if (!hasNextPage) return null
  return (
    <div className="flex justify-center">
      <Button disabled={isFetchingNextPage} onClick={onLoadMore} type="button" variant="outline">
        {isFetchingNextPage ? (
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
        ) : null}
        {isFetchingNextPage ? "Loading…" : "Load more"}
      </Button>
    </div>
  )
}

export function ResultsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}
