import { createFileRoute, Link, useRouter } from "@tanstack/react-router"

import { SignInForm } from "@/components/foundation/sign-in-form"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"
import { safeRedirectDestination } from "@/lib/session-routing"

export const Route = createFileRoute("/_public/sign-in")({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const router = useRouter()

  async function signIn(credentials: { email: string; password: string }) {
    const result = await authClient.signIn.email(credentials)
    if (result.error) {
      return {
        ok: false as const,
        message: result.error.message ?? "We couldn’t sign you in. Check your details and retry.",
      }
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    await router.navigate({ href: safeRedirectDestination(search.redirect), replace: true })
    return { ok: true as const }
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:px-8">
      <div className="min-w-0 space-y-4">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Continue planning
        </p>
        <h1
          data-route-heading
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Sign in to GlobeTrotter
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          Return to your Trips and continue from the page you intended to visit.
        </p>
      </div>
      <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        <SignInForm onSignIn={signIn} />
        <div className="mt-5 border-t pt-5 text-center text-sm text-muted-foreground">
          New to GlobeTrotter?{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link to="/">Explore first</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
