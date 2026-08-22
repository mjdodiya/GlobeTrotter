import { type FormEvent, useRef, useState } from "react"

import {
  describedBy,
  emailValidationMessage,
  focusFormField,
  type AuthActionResult,
} from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Credentials = { email: string; password: string }
type SignInField = keyof Credentials

export function SignInForm({
  forgotPasswordHref = "/forgot-password",
  onSignIn,
}: {
  forgotPasswordHref?: string
  onSignIn: (credentials: Credentials) => Promise<AuthActionResult<SignInField>>
}) {
  const [errors, setErrors] = useState<Partial<Record<SignInField, string | undefined>>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionLocked.current) return

    const form = event.currentTarget
    const data = new FormData(form)
    const credentials = {
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    }
    const nextErrors: Partial<Record<SignInField, string | undefined>> = {
      email: emailValidationMessage(credentials.email),
      password: credentials.password ? undefined : "Enter your password.",
    }
    setErrors(nextErrors)
    setFormError(undefined)

    const firstInvalidField = (Object.keys(nextErrors) as SignInField[]).find(
      (field) => nextErrors[field],
    )
    if (firstInvalidField) {
      focusFormField(form, firstInvalidField)
      return
    }

    submissionLocked.current = true
    setSubmitting(true)

    try {
      const result = await onSignIn(credentials)
      if (!result.ok) {
        if (result.field) setErrors({ [result.field]: result.message })
        else setErrors({ password: result.message })
        focusFormField(form, result.field ?? "password")
      }
    } catch {
      setFormError("We couldn’t sign you in. Check your connection and try again.")
      focusFormField(form, "email")
    } finally {
      submissionLocked.current = false
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            required
            spellCheck={false}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy(errors.email && "sign-in-email-error")}
          />
          {errors.email ? <FieldError id="sign-in-email-error">{errors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href={forgotPasswordHref}
              className="rounded-sm text-sm text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy(errors.password && "sign-in-password-error")}
          />
          {errors.password ? (
            <FieldError id="sign-in-password-error">{errors.password}</FieldError>
          ) : null}
        </Field>
        {formError ? <FieldError id="sign-in-form-error">{formError}</FieldError> : null}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  )
}
