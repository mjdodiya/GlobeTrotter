import { createFileRoute, Link } from "@tanstack/react-router"

import { FocusedStatus } from "@/components/auth/auth-form"
import { AuthPage } from "@/components/auth/auth-page"
import { ResetPasswordForm } from "@/components/auth/password-forms"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { recoveryError } from "@/lib/auth-errors"
import { expireSession } from "@/lib/session"
import { safeRedirectDestination, signInHref } from "@/lib/session-routing"

export const Route = createFileRoute("/_public/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.error === "string" ? { error: search.error } : {}),
    ...(typeof search.redirect === "string" ? { redirect: search.redirect } : {}),
    ...(typeof search.token === "string" ? { token: search.token } : {}),
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const search = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const invalidLink = Boolean(search.error || !search.token)
  const intendedDestination = safeRedirectDestination(search.redirect)

  async function resetPassword(newPassword: string) {
    const result = await authClient.resetPassword({ newPassword, token: search.token })
    if (result.error) {
      return {
        ok: false as const,
        field: "password" as const,
        message: recoveryError(
          result.error,
          "This reset link is invalid or expired. Request a new link and try again.",
        ),
      }
    }
    expireSession(queryClient)
    return { ok: true as const }
  }

  return (
    <AuthPage
      eyebrow="Account recovery"
      title={invalidLink ? "Reset link unavailable" : "Choose a new password"}
      description={
        invalidLink
          ? "This password-reset link is invalid or expired. Request a fresh link to continue."
          : "Choose a new password for your GlobeTrotter account."
      }
      footer={
        <Button asChild variant="link" className="h-auto p-0">
          <Link to="/forgot-password" search={{ redirect: intendedDestination }}>
            Request a new reset link
          </Link>
        </Button>
      }
    >
      {invalidLink ? (
        <FocusedStatus role="alert" className="border-destructive/25 bg-destructive/5">
          For your security, reset links are single-use and expire after one hour.
        </FocusedStatus>
      ) : (
        <ResetPasswordForm
          onResetPassword={resetPassword}
          signInHref={signInHref(intendedDestination)}
        />
      )}
    </AuthPage>
  )
}
