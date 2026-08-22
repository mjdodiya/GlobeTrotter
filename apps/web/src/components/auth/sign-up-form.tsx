import { type FormEvent, useRef, useState } from "react"

import {
  describedBy,
  emailValidationMessage,
  focusFormField,
  type AuthActionResult,
} from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type SignUpDetails = { email: string; name: string; password: string }
type SignUpField = keyof SignUpDetails | "passwordConfirmation"

export function SignUpForm({
  onSignUp,
}: {
  onSignUp: (details: SignUpDetails) => Promise<AuthActionResult<keyof SignUpDetails>>
}) {
  const [errors, setErrors] = useState<Partial<Record<SignUpField, string | undefined>>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const submissionLocked = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionLocked.current) return

    const form = event.currentTarget
    const data = new FormData(form)
    const details: SignUpDetails = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    }
    const passwordConfirmation = String(data.get("passwordConfirmation") ?? "")
    const nextErrors: Partial<Record<SignUpField, string | undefined>> = {
      name: details.name ? undefined : "Enter your name.",
      email: emailValidationMessage(details.email),
      password:
        details.password.length < 8
          ? "Use at least 8 characters."
          : details.password.length > 128
            ? "Use no more than 128 characters."
            : undefined,
      passwordConfirmation:
        passwordConfirmation === details.password ? undefined : "Passwords do not match.",
    }
    setErrors(nextErrors)
    setFormError(undefined)
    const firstInvalidField = (Object.keys(nextErrors) as SignUpField[]).find(
      (field) => nextErrors[field],
    )
    if (firstInvalidField) {
      focusFormField(form, firstInvalidField)
      return
    }

    submissionLocked.current = true
    setSubmitting(true)
    try {
      const result = await onSignUp(details)
      if (!result.ok) {
        if (result.field) setErrors({ [result.field]: result.message })
        else setFormError(result.message)
        focusFormField(form, result.field ?? "name")
      }
    } catch {
      setFormError("We couldn’t create your account. Check your connection and try again.")
      focusFormField(form, "name")
    } finally {
      submissionLocked.current = false
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={submitting}>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
          <Input
            id="sign-up-name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy(errors.name && "sign-up-name-error")}
          />
          {errors.name ? <FieldError id="sign-up-name-error">{errors.name}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            id="sign-up-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            required
            spellCheck={false}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy(errors.email && "sign-up-email-error")}
          />
          {errors.email ? <FieldError id="sign-up-email-error">{errors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy(
              "sign-up-password-description",
              errors.password && "sign-up-password-error",
            )}
          />
          <FieldDescription id="sign-up-password-description">
            Use 8–128 characters.
          </FieldDescription>
          {errors.password ? (
            <FieldError id="sign-up-password-error">{errors.password}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={Boolean(errors.passwordConfirmation)}>
          <FieldLabel htmlFor="sign-up-password-confirmation">Confirm password</FieldLabel>
          <Input
            id="sign-up-password-confirmation"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            aria-invalid={Boolean(errors.passwordConfirmation)}
            aria-describedby={describedBy(
              errors.passwordConfirmation && "sign-up-password-confirmation-error",
            )}
          />
          {errors.passwordConfirmation ? (
            <FieldError id="sign-up-password-confirmation-error">
              {errors.passwordConfirmation}
            </FieldError>
          ) : null}
        </Field>
        {formError ? <FieldError>{formError}</FieldError> : null}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  )
}
