import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountFoundationPage,
})

function AccountFoundationPage() {
  const { session } = Route.useRouteContext()
  return (
    <div className="min-w-0 space-y-6">
      <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
        Account settings
      </h1>
      <p className="break-words text-muted-foreground">Signed in as {session.user.email}.</p>
      <section className="max-w-2xl space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Email verification</h2>
        <p className="text-sm text-muted-foreground">
          {session.user.emailVerified
            ? "Your email is verified. You can publish Trips and invite direct collaborators."
            : "Verify your email before you publish a Trip or invite a direct collaborator."}
        </p>
        {session.user.emailVerified ? null : (
          <Button asChild>
            <a href={`/verify-email?email=${encodeURIComponent(session.user.email)}`}>
              Verify email
            </a>
          </Button>
        )}
      </section>
    </div>
  )
}
