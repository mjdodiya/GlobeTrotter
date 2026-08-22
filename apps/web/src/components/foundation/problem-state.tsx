import { AlertTriangle, LogIn, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiProblemError } from "@/lib/http"
import { normalizeProblemDetails, type ProblemDetails } from "@/lib/problem-details"
import { signInHref } from "@/lib/session-routing"

export function problemFromError(error: unknown): ProblemDetails {
  if (error instanceof ApiProblemError) return error.problem
  return normalizeProblemDetails(undefined, 500)
}

export function ProblemState({
  onRetry,
  problem,
}: {
  onRetry?: () => void
  problem: ProblemDetails
}) {
  const isAuthentication = problem.kind === "authentication"
  const retryLabel =
    problem.kind === "stale-trip" || problem.kind === "precondition"
      ? "Refresh latest Trip"
      : "Try again"
  const intendedDestination = `${window.location.pathname}${window.location.search}${window.location.hash}`

  return (
    <section
      aria-labelledby="problem-title"
      className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-8"
      role="alert"
    >
      <span className="rounded-full bg-destructive/10 p-2 text-destructive" aria-hidden="true">
        <AlertTriangle className="size-5" />
      </span>
      <div className="min-w-0 space-y-2">
        <h1 id="problem-title" data-route-heading tabIndex={-1} className="text-xl font-semibold">
          {isAuthentication ? "Your session ended" : problem.title}
        </h1>
        <p className="text-pretty text-muted-foreground">
          {isAuthentication ? "Sign in again to continue where you left off." : problem.detail}
        </p>
      </div>

      {problem.errors ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {Object.entries(problem.errors).flatMap(([field, messages]) =>
            messages.map((message) => <li key={`${field}-${message}`}>{message}</li>),
          )}
        </ul>
      ) : null}

      {problem.requestId ? (
        <p className="text-xs break-all text-muted-foreground">Reference: {problem.requestId}</p>
      ) : null}

      {isAuthentication ? (
        <Button asChild>
          <a href={signInHref(intendedDestination)}>
            <LogIn aria-hidden="true" /> Sign in
          </a>
        </Button>
      ) : onRetry ? (
        <Button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> {retryLabel}
        </Button>
      ) : null}
    </section>
  )
}
