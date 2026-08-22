import { AlertDialog } from "radix-ui"
import { useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import type { ProblemDetails } from "@/lib/problem-details"

import { centeredModalClassName, modalOverlayClassName } from "./modal-styles"

export function StaleTripRecovery({
  onCancel,
  onRefresh,
  onRetry,
  open,
  problem,
}: {
  onCancel: () => void
  onRefresh: () => Promise<void>
  onRetry: () => void
  open: boolean
  problem: ProblemDetails
}) {
  const [reviewingProblem, setReviewingProblem] = useState<string>()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string>()
  const problemIdentity = `${problem.type}:${problem.requestId ?? problem.detail}`
  const isReviewing = open && reviewingProblem === problemIdentity
  const focusReviewPanel = useCallback((node: HTMLHeadingElement | null) => node?.focus(), [])

  async function refresh() {
    setIsRefreshing(true)
    setRefreshError(undefined)
    try {
      await onRefresh()
      setReviewingProblem(problemIdentity)
    } catch {
      setRefreshError("The latest Trip could not be loaded. Check your connection and try again.")
    } finally {
      setIsRefreshing(false)
    }
  }

  function cancel() {
    setReviewingProblem(undefined)
    setRefreshError(undefined)
    onCancel()
  }

  function retry() {
    setReviewingProblem(undefined)
    setRefreshError(undefined)
    onRetry()
  }

  if (isReviewing) {
    return (
      <section
        aria-labelledby="stale-trip-review-title"
        className="fixed right-4 bottom-4 z-40 grid w-[calc(100%-2rem)] max-w-md gap-4 rounded-2xl border bg-background p-5 shadow-xl"
        role="region"
      >
        <div className="space-y-2">
          <h2
            id="stale-trip-review-title"
            ref={focusReviewPanel}
            tabIndex={-1}
            className="font-semibold"
          >
            Review the refreshed Trip
          </h2>
          <p className="text-sm text-muted-foreground">
            The page now shows the latest Trip. Compare it with your intended change, then retry
            only if your change is still safe.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={cancel}>
            Discard my changes
          </Button>
          <Button type="button" onClick={retry}>
            Retry my changes
          </Button>
        </div>
      </section>
    )
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && cancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={modalOverlayClassName} />
        <AlertDialog.Content className={`${centeredModalClassName} max-w-lg`}>
          <div className="space-y-2">
            <AlertDialog.Title className="text-lg font-semibold">
              Review the latest Trip before retrying
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              {problem.detail} Your changes have not been applied. Load the latest version, review
              it, then choose whether to retry.
            </AlertDialog.Description>
          </div>

          {refreshError ? (
            <p role="alert" className="text-sm text-destructive">
              {refreshError}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline">
                Cancel changes
              </Button>
            </AlertDialog.Cancel>
            <Button type="button" variant="secondary" disabled={isRefreshing} onClick={refresh}>
              {isRefreshing ? "Loading latest Trip…" : "Review latest Trip"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
