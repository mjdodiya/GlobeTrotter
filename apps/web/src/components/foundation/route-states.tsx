import type { ErrorComponentProps } from "@tanstack/react-router"
import { Inbox, LoaderCircle, MapPinOff } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

import { ProblemState, problemFromError } from "./problem-state"

export function RouteLoadingState({ label = "Loading page" }: { label?: string }) {
  return (
    <section aria-busy="true" aria-live="polite" className="grid min-h-64 place-items-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        <span>{label}…</span>
      </div>
    </section>
  )
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-muted/20 p-5 text-center sm:p-8">
      <div className="flex max-w-md flex-col items-center gap-3">
        <span className="rounded-full bg-muted p-3 text-muted-foreground" aria-hidden="true">
          <Inbox className="size-6" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        {action}
      </div>
    </section>
  )
}

export function NotFoundState() {
  return (
    <section className="grid min-h-64 place-items-center text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <MapPinOff className="size-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-2">
          <h1 data-route-heading tabIndex={-1} className="text-2xl font-semibold">
            We couldn’t find that page
          </h1>
          <p className="text-muted-foreground">
            The link may be outdated, or the page may no longer be available.
          </p>
        </div>
        <Button asChild>
          <a href="/">Return home</a>
        </Button>
      </div>
    </section>
  )
}

export function RouteErrorState({ error, reset }: ErrorComponentProps) {
  return <ProblemState problem={problemFromError(error)} onRetry={reset} />
}
