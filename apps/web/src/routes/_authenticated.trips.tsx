import { createFileRoute } from "@tanstack/react-router"

import { EmptyState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_authenticated/trips")({
  component: TripsFoundationPage,
})

function TripsFoundationPage() {
  return (
    <div className="min-w-0 space-y-8">
      <header className="space-y-2">
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          My Trips
        </h1>
        <p className="text-muted-foreground">Trips you own or participate in will appear here.</p>
      </header>
      <EmptyState
        title="Start with a new Trip"
        description="Trip creation is coming in a dedicated workflow."
        action={<Button disabled>Create Trip</Button>}
      />
    </div>
  )
}
