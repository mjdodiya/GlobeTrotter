import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Credentials = { email: string; password: string }
type SignInResult = { ok: true } | { message: string; ok: false }

export function SignInForm({
  onSignIn,
}: {
  onSignIn: (credentials: Credentials) => Promise<SignInResult>
}) {
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    const data = new FormData(event.currentTarget)

    try {
      const result = await onSignIn({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      })
      if (!result.ok) setError(result.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "sign-in-error" : undefined}
          />
        </Field>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "sign-in-error" : undefined}
          />
          {error ? <FieldError id="sign-in-error">{error}</FieldError> : null}
        </Field>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  )
}
