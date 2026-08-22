import { createFileRoute, Link } from "@tanstack/react-router"

import { AuthPage } from "@/components/auth/auth-page"
import { ForgotPasswordForm } from "@/components/auth/password-forms"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { recoveryError } from "@/lib/auth-errors"
import { absoluteApplicationUrl, safeRedirectDestination } from "@/lib/session-routing"

export const Route = createFileRoute("/_public/forgot-password")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: ForgotPasswordPage,
})

async function requestReset(email: string, intendedDestination: string) {
  const result = await authClient.requestPasswordReset({
    email,
    redirectTo: absoluteApplicationUrl(
      `/reset-password?redirect=${encodeURIComponent(intendedDestination)}`,
    ),
  })
  if (result.error) {
    return {
      ok: false as const,
      message: recoveryError(result.error, "We couldn’t request a reset link. Try again."),
    }
  }
  return { ok: true as const }
}

function ForgotPasswordPage() {
  const search = Route.useSearch()
  const intendedDestination = safeRedirectDestination(search.redirect)

  return (
    <AuthPage
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your account email. If it matches an account, we’ll send a secure reset link."
      footer={
        <Button asChild variant="link" className="h-auto p-0">
          <Link to="/sign-in" search={{ redirect: intendedDestination }}>
            Return to sign in
          </Link>
        </Button>
      }
    >
      <ForgotPasswordForm onRequestReset={(email) => requestReset(email, intendedDestination)} />
    </AuthPage>
  )
}
