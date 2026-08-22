import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountFoundationPage,
})

function AccountFoundationPage() {
  const { session } = Route.useRouteContext()
  return (
    <div className="min-w-0 space-y-3">
      <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
        Account settings
      </h1>
      <p className="break-words text-muted-foreground">
        Signed in as {session.user.email}. Account workflows are implemented in their dedicated
        journey.
      </p>
    </div>
  )
}
