import { createFileRoute } from "@tanstack/react-router"
import { useEffect } from "react"

import { FocusedStatus } from "@/components/auth/auth-form"
import { AuthPage } from "@/components/auth/auth-page"
import { VerificationResendForm } from "@/components/auth/verification-resend-form"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { recoveryError } from "@/lib/auth-errors"
import { queryKeys } from "@/lib/query-keys"
import { refreshSession } from "@/lib/session"
import {
  absoluteApplicationUrl,
  safeRedirectDestination,
  verificationCallbackHref,
} from "@/lib/session-routing"

export const Route = createFileRoute("/_public/verify-email")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search.email === "string" ? { email: search.email } : {}),
    ...(typeof search.error === "string" ? { error: search.error } : {}),
    ...(typeof search.redirect === "string" ? { redirect: search.redirect } : {}),
    ...(search.verified === true || search.verified === "true" ? { verified: true } : {}),
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const search = Route.useSearch()
  const { queryClient } = Route.useRouteContext()
  const destination = safeRedirectDestination(search.redirect)
  const failed = Boolean(search.error)
  const verified = Boolean(search.verified && !failed)

  useEffect(() => {
    if (!verified) return
    void refreshSession(queryClient).catch(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    })
  }, [queryClient, verified])

  async function resend(email: string) {
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: absoluteApplicationUrl(verificationCallbackHref(destination)),
    })
    if (result.error) {
      return {
        ok: false as const,
        field: "email" as const,
        message: recoveryError(result.error, "We couldn’t send a verification email. Try again."),
      }
    }
    return { ok: true as const }
  }

  return (
    <AuthPage
      eyebrow="Email verification"
      title={verified ? "Email verified" : failed ? "Verification link failed" : "Check your inbox"}
      description={
        verified
          ? "Your account can now publish Trips and use direct collaboration."
          : failed
            ? "This verification link is invalid or expired. Send yourself a fresh link below."
            : "Open the verification link we emailed you. You can keep planning while you wait."
      }
      footer={
        <Button asChild variant="link" className="h-auto p-0">
          <a href={verified || !failed ? destination : "/sign-in"}>
            {verified || !failed ? "Continue to GlobeTrotter" : "Return to sign in"}
          </a>
        </Button>
      }
    >
      {verified ? (
        <FocusedStatus>
          Your session has been refreshed with your verified account status.
        </FocusedStatus>
      ) : (
        <div className="space-y-5">
          {failed ? (
            <FocusedStatus role="alert" className="border-destructive/25 bg-destructive/5">
              Verification links are single-use and expire. Requesting a new link is safe.
            </FocusedStatus>
          ) : null}
          <VerificationResendForm initialEmail={search.email ?? ""} onResend={resend} />
        </div>
      )}
    </AuthPage>
  )
}
