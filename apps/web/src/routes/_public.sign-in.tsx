import { createFileRoute, Link, useRouter } from "@tanstack/react-router"

import { AuthPage } from "@/components/auth/auth-page"
import { SignInForm } from "@/components/foundation/sign-in-form"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { signInError } from "@/lib/auth-errors"
import { establishSession } from "@/lib/session"
import { safeRedirectDestination } from "@/lib/session-routing"

export const Route = createFileRoute("/_public/sign-in")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const router = useRouter()
  const intendedDestination = safeRedirectDestination(search.redirect)

  async function signIn(credentials: { email: string; password: string }) {
    const result = await authClient.signIn.email(credentials)
    if (result.error) {
      return { ok: false as const, ...signInError(result.error) }
    }

    await establishSession(queryClient)
    await router.navigate({ href: intendedDestination, replace: true })
    return { ok: true as const }
  }

  return (
    <AuthPage
      eyebrow="Continue planning"
      title="Sign in to GlobeTrotter"
      description="Return to your Trips and continue from the page you intended to visit."
      footer={
        <>
          New to GlobeTrotter?{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link to="/sign-up" search={search.redirect ? { redirect: search.redirect } : {}}>
              Create an account
            </Link>
          </Button>
        </>
      }
    >
      <SignInForm
        forgotPasswordHref={`/forgot-password?redirect=${encodeURIComponent(intendedDestination)}`}
        onSignIn={signIn}
      />
    </AuthPage>
  )
}
