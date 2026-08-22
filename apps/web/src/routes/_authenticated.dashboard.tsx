import { createFileRoute, Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"

import { EmptyState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  return (
    <div className="min-w-0 space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          {session.user.name || "Traveler"}’s dashboard
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Your upcoming and recent Trips will appear here.
        </p>
      </header>
      <EmptyState
        title="No Trips to show yet"
        description="Create your first Trip to start shaping a route, schedule, and budget."
        action={
          <Button asChild>
            <Link to="/trips">
              <Plus aria-hidden="true" /> Plan a Trip
            </Link>
          </Button>
        }
      />
    </div>
  )
}
