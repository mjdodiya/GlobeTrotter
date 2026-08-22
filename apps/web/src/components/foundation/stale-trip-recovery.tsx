import { AlertDialog } from "radix-ui"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { ProblemDetails } from "@/lib/problem-details"

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
  const [refreshedProblem, setRefreshedProblem] = useState<string>()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const problemIdentity = `${problem.type}:${problem.requestId ?? problem.detail}`
  const hasLatestTrip = open && refreshedProblem === problemIdentity

  async function refresh() {
    setIsRefreshing(true)
    try {
      await onRefresh()
      setRefreshedProblem(problemIdentity)
    } finally {
      setIsRefreshing(false)
    }
  }

  function cancel() {
    setRefreshedProblem(undefined)
    onCancel()
  }

  function retry() {
    setRefreshedProblem(undefined)
    onRetry()
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && cancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/45 motion-safe:animate-in motion-safe:fade-in" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border bg-background p-5 shadow-xl motion-safe:animate-in motion-safe:zoom-in-95 sm:p-6">
          <div className="space-y-2">
            <AlertDialog.Title className="text-lg font-semibold">
              Review the latest Trip before retrying
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted-foreground">
              {problem.detail} Your changes have not been applied. Load the latest version, review
              it, then choose whether to retry.
            </AlertDialog.Description>
          </div>

          {hasLatestTrip ? (
            <p role="status" className="text-sm font-medium text-emerald-700">
              Latest Trip loaded. Review the page before retrying your changes.
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
            <Button type="button" disabled={!hasLatestTrip || isRefreshing} onClick={retry}>
              Retry my changes
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
