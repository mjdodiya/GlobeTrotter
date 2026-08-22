import { type FormEvent, useRef, useState } from "react"

import {
  describedBy,
  emailValidationMessage,
  FocusedStatus,
  focusFormField,
  type AuthActionResult,
} from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function VerificationResendForm({
  initialEmail = "",
  onResend,
}: {
  initialEmail?: string
  onResend: (email: string) => Promise<AuthActionResult<"email">>
}) {
  const [emailError, setEmailError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionLocked.current) return
    const form = event.currentTarget
    const email = String(new FormData(form).get("email") ?? "").trim()
    const validationError = emailValidationMessage(email)
    setEmailError(validationError)
    setFormError(undefined)
    setSent(false)
    if (validationError) {
      focusFormField(form, "email")
      return
    }

    submissionLocked.current = true
    setSubmitting(true)
    try {
      const result = await onResend(email)
      if (result.ok) setSent(true)
      else {
        if (result.field === "email") setEmailError(result.message)
        else setFormError(result.message)
        focusFormField(form, "email")
      }
    } catch {
      setFormError("We couldn’t send a verification email. Check your connection and try again.")
      focusFormField(form, "email")
    } finally {
      submissionLocked.current = false
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting}>
      <FieldGroup>
        <Field data-invalid={Boolean(emailError)}>
          <FieldLabel htmlFor="verification-email">Email</FieldLabel>
          <Input
            id="verification-email"
            name="email"
            type="email"
            defaultValue={initialEmail}
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            required
            spellCheck={false}
            aria-invalid={Boolean(emailError)}
            aria-describedby={describedBy(emailError && "verification-email-error")}
          />
          {emailError ? <FieldError id="verification-email-error">{emailError}</FieldError> : null}
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
        {sent ? (
          <FocusedStatus>
            A fresh verification link is on its way. You can close this page after checking your
            inbox.
          </FocusedStatus>
        ) : null}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending email…" : sent ? "Send another link" : "Resend verification"}
        </Button>
      </FieldGroup>
    </form>
  )
}
