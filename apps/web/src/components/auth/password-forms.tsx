import { type FormEvent, useRef, useState } from "react"

import {
  describedBy,
  emailValidationMessage,
  FocusedStatus,
  focusFormField,
  type AuthActionResult,
} from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ForgotPasswordForm({
  onRequestReset,
}: {
  onRequestReset: (email: string) => Promise<AuthActionResult<"email">>
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
    if (validationError) {
      focusFormField(form, "email")
      return
    }

    submissionLocked.current = true
    setSubmitting(true)
    try {
      const result = await onRequestReset(email)
      if (result.ok) setSent(true)
      else {
        if (result.field === "email") setEmailError(result.message)
        else setFormError(result.message)
        focusFormField(form, "email")
      }
    } catch {
      setFormError("We couldn’t request a reset link. Check your connection and try again.")
      focusFormField(form, "email")
    } finally {
      submissionLocked.current = false
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <FocusedStatus>
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          If an account exists for that email, a password-reset link is on its way.
        </p>
      </FocusedStatus>
    )
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting}>
      <FieldGroup>
        <Field data-invalid={Boolean(emailError)}>
          <FieldLabel htmlFor="recovery-email">Email</FieldLabel>
          <Input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            required
            spellCheck={false}
            aria-invalid={Boolean(emailError)}
            aria-describedby={describedBy(emailError && "recovery-email-error")}
          />
          {emailError ? <FieldError id="recovery-email-error">{emailError}</FieldError> : null}
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Sending link…" : "Send reset link"}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function ResetPasswordForm({
  onResetPassword,
  signInHref = "/sign-in",
}: {
  onResetPassword: (newPassword: string) => Promise<AuthActionResult<"password">>
  signInHref?: string
}) {
  const [errors, setErrors] = useState<
    Partial<Record<"password" | "passwordConfirmation", string | undefined>>
  >({})
  const [formError, setFormError] = useState<string>()
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionLocked.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const password = String(data.get("password") ?? "")
    const passwordConfirmation = String(data.get("passwordConfirmation") ?? "")
    const nextErrors = {
      password:
        password.length < 8
          ? "Use at least 8 characters."
          : password.length > 128
            ? "Use no more than 128 characters."
            : undefined,
      passwordConfirmation:
        passwordConfirmation === password ? undefined : "Passwords do not match.",
    }
    setErrors(nextErrors)
    setFormError(undefined)
    const firstInvalidField = (
      Object.keys(nextErrors) as Array<"password" | "passwordConfirmation">
    ).find((field) => nextErrors[field])
    if (firstInvalidField) {
      focusFormField(form, firstInvalidField)
      return
    }

    submissionLocked.current = true
    setSubmitting(true)
    try {
      const result = await onResetPassword(password)
      if (result.ok) setComplete(true)
      else {
        if (result.field === "password") setErrors({ password: result.message })
        else setFormError(result.message)
        focusFormField(form, "password")
      }
    } catch {
      setFormError("We couldn’t reset your password. Check your connection and try again.")
      focusFormField(form, "password")
    } finally {
      submissionLocked.current = false
      setSubmitting(false)
    }
  }

  if (complete) {
    return (
      <div className="space-y-4">
        <FocusedStatus>
          <p className="font-medium">Your password has been reset</p>
          <p className="mt-1 text-muted-foreground">
            For your security, existing sessions have ended. Sign in with your new password.
          </p>
        </FocusedStatus>
        <Button asChild className="w-full" size="lg">
          <a href={signInHref}>Continue to sign in</a>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="reset-password">New password</FieldLabel>
          <Input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy(
              "reset-password-description",
              errors.password && "reset-password-error",
            )}
          />
          <FieldDescription id="reset-password-description">Use 8–128 characters.</FieldDescription>
          {errors.password ? (
            <FieldError id="reset-password-error">{errors.password}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={Boolean(errors.passwordConfirmation)}>
          <FieldLabel htmlFor="reset-password-confirmation">Confirm new password</FieldLabel>
          <Input
            id="reset-password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={Boolean(errors.passwordConfirmation)}
            aria-describedby={describedBy(
              errors.passwordConfirmation && "reset-password-confirmation-error",
            )}
          />
          {errors.passwordConfirmation ? (
            <FieldError id="reset-password-confirmation-error">
              {errors.passwordConfirmation}
            </FieldError>
          ) : null}
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Resetting password…" : "Reset password"}
        </Button>
      </FieldGroup>
    </form>
  )
}
