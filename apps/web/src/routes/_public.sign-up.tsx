import { createFileRoute, Link, useRouter } from "@tanstack/react-router"

import { AuthPage } from "@/components/auth/auth-page"
import { SignUpForm, type SignUpDetails } from "@/components/auth/sign-up-form"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { signUpError } from "@/lib/auth-errors"
import { establishSession } from "@/lib/session"
import {
  absoluteApplicationUrl,
  safeRedirectDestination,
  verificationCallbackHref,
} from "@/lib/session-routing"

export const Route = createFileRoute("/_public/sign-up")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: SignUpPage,
})

function SignUpPage() {
  const search = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const router = useRouter()
  const intendedDestination = safeRedirectDestination(search.redirect)

  async function signUp(details: SignUpDetails) {
    const result = await authClient.signUp.email({
      ...details,
      callbackURL: absoluteApplicationUrl(verificationCallbackHref(intendedDestination)),
    })
    if (result.error) return { ok: false as const, ...signUpError(result.error) }

    await establishSession(queryClient)
    await router.navigate({
      to: "/verify-email",
      search: { email: details.email, redirect: intendedDestination },
      replace: true,
    })
    return { ok: true as const }
  }

  return (
    <AuthPage
      eyebrow="Start planning"
      title="Create your GlobeTrotter account"
      description="Create an account with your email and a secure password. We’ll send a verification link for publishing and direct collaboration."
      footer={
        <>
          Already have an account?{" "}
          <Button asChild variant="link" className="h-auto p-0">
            <Link to="/sign-in" search={search.redirect ? { redirect: search.redirect } : {}}>
              Sign in
            </Link>
          </Button>
        </>
      }
    >
      <SignUpForm onSignUp={signUp} />
    </AuthPage>
  )
}
