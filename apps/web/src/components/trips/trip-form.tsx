import { useState } from "react"

import { FocusedStatus, describedBy, focusFormField } from "@/components/auth/auth-form"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ProblemDetails } from "@/lib/problem-details"

export type TripFormValues = {
  baseCurrency: string
  budgetLimit: string | null
  description: string | null
  endDate: string
  name: string
  startDate: string
  visibility: "private" | "public"
}

export type TripFormInitialValues = Omit<TripFormValues, "budgetLimit" | "description"> & {
  budgetLimit: string | null
  description: string | null
}

type TripFormErrors = Partial<Record<keyof TripFormValues, string>>

export function validateTripForm(values: TripFormValues): TripFormErrors {
  const errors: TripFormErrors = {}
  if (!values.name) errors.name = "Enter a Trip name."
  if (!values.startDate) errors.startDate = "Choose the first travel day."
  if (!values.endDate) errors.endDate = "Choose the departure date."
  else if (values.startDate && values.endDate <= values.startDate) {
    errors.endDate = "The departure date must be after the first travel day."
  }
  if (!/^[A-Z]{3}$/.test(values.baseCurrency)) {
    errors.baseCurrency = "Use a three-letter currency code such as USD or INR."
  }
  if (
    values.budgetLimit !== null &&
    !/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/.test(values.budgetLimit)
  ) {
    errors.budgetLimit = "Use a non-negative amount with up to four decimal places."
  }
  return errors
}

function fieldProblem(
  field: keyof TripFormValues,
  localErrors: TripFormErrors,
  problem?: ProblemDetails,
): string | undefined {
  return localErrors[field] ?? problem?.errors?.[field]?.[0]
}

export function TripForm({
  allowPublic,
  canManageOwnerSettings,
  initialValues,
  isPending,
  onSubmit,
  problem,
  submitLabel,
}: {
  allowPublic: boolean
  canManageOwnerSettings: boolean
  initialValues: TripFormInitialValues
  isPending: boolean
  onSubmit: (values: TripFormValues) => void
  problem?: ProblemDetails | undefined
  submitLabel: string
}) {
  const [localErrors, setLocalErrors] = useState<TripFormErrors>({})

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const values: TripFormValues = {
      name: String(data.get("name") ?? "").trim(),
      description: String(data.get("description") ?? "").trim() || null,
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      budgetLimit: String(data.get("budgetLimit") ?? "").trim() || null,
      baseCurrency: String(data.get("baseCurrency") ?? initialValues.baseCurrency)
        .trim()
        .toUpperCase(),
      visibility:
        canManageOwnerSettings &&
        (data.get("visibility") === "private" || data.get("visibility") === "public")
          ? (data.get("visibility") as TripFormValues["visibility"])
          : initialValues.visibility,
    }
    const errors = validateTripForm(values)
    setLocalErrors(errors)
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      focusFormField(form, firstError)
      return
    }
    onSubmit(values)
  }

  const generalProblem = problem?.errors ? undefined : problem

  return (
    <form noValidate className="space-y-6" onSubmit={submit}>
      {generalProblem ? (
        <FocusedStatus role="alert" className="border-destructive/25 bg-destructive/5">
          <p className="font-medium">{generalProblem.title}</p>
          <p className="mt-1 text-muted-foreground">{generalProblem.detail}</p>
          {generalProblem.requestId ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Reference: {generalProblem.requestId}
            </p>
          ) : null}
        </FocusedStatus>
      ) : null}

      <FieldGroup>
        <Field data-invalid={Boolean(fieldProblem("name", localErrors, problem))}>
          <FieldLabel htmlFor="trip-name">Trip name</FieldLabel>
          <Input
            aria-describedby={describedBy(
              "trip-name-description",
              fieldProblem("name", localErrors, problem) && "trip-name-error",
            )}
            aria-invalid={Boolean(fieldProblem("name", localErrors, problem))}
            autoComplete="off"
            defaultValue={initialValues.name}
            id="trip-name"
            maxLength={500}
            name="name"
            required
          />
          <FieldDescription id="trip-name-description">
            A clear name participants will recognize.
          </FieldDescription>
          <FieldError id="trip-name-error">{fieldProblem("name", localErrors, problem)}</FieldError>
        </Field>

        <Field data-invalid={Boolean(fieldProblem("description", localErrors, problem))}>
          <FieldLabel htmlFor="trip-description">Description</FieldLabel>
          <Textarea
            aria-invalid={Boolean(fieldProblem("description", localErrors, problem))}
            defaultValue={initialValues.description ?? ""}
            id="trip-description"
            maxLength={20_000}
            name="description"
            placeholder="What are you hoping to experience?"
            rows={5}
          />
          <FieldError>{fieldProblem("description", localErrors, problem)}</FieldError>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldProblem("startDate", localErrors, problem))}>
            <FieldLabel htmlFor="trip-start-date">First travel day</FieldLabel>
            <Input
              aria-invalid={Boolean(fieldProblem("startDate", localErrors, problem))}
              defaultValue={initialValues.startDate}
              id="trip-start-date"
              name="startDate"
              required
              type="date"
            />
            <FieldError>{fieldProblem("startDate", localErrors, problem)}</FieldError>
          </Field>
          <Field data-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}>
            <FieldLabel htmlFor="trip-end-date">Departure date</FieldLabel>
            <Input
              aria-describedby="trip-end-date-description"
              aria-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}
              defaultValue={initialValues.endDate}
              id="trip-end-date"
              name="endDate"
              required
              type="date"
            />
            <FieldDescription id="trip-end-date-description">
              This date is excluded from the Travel Period: it is the day you depart, not a full day
              in the Trip.
            </FieldDescription>
            <FieldError>{fieldProblem("endDate", localErrors, problem)}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(fieldProblem("budgetLimit", localErrors, problem))}>
          <FieldLabel htmlFor="trip-budget-limit">Budget Limit</FieldLabel>
          <Input
            aria-describedby="trip-budget-description"
            aria-invalid={Boolean(fieldProblem("budgetLimit", localErrors, problem))}
            defaultValue={initialValues.budgetLimit ?? ""}
            id="trip-budget-limit"
            inputMode="decimal"
            name="budgetLimit"
            placeholder="Optional"
          />
          <FieldDescription id="trip-budget-description">
            Optional spending ceiling in the Trip’s Base Currency.
          </FieldDescription>
          <FieldError>{fieldProblem("budgetLimit", localErrors, problem)}</FieldError>
        </Field>

        {canManageOwnerSettings ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldProblem("baseCurrency", localErrors, problem))}>
              <FieldLabel htmlFor="trip-base-currency">Base Currency</FieldLabel>
              <Input
                aria-describedby="trip-currency-description"
                aria-invalid={Boolean(fieldProblem("baseCurrency", localErrors, problem))}
                autoCapitalize="characters"
                defaultValue={initialValues.baseCurrency}
                id="trip-base-currency"
                maxLength={3}
                name="baseCurrency"
                pattern="[A-Za-z]{3}"
                required
              />
              <FieldDescription id="trip-currency-description">
                Three-letter code used for all Trip estimates, such as USD or INR.
              </FieldDescription>
              <FieldError>{fieldProblem("baseCurrency", localErrors, problem)}</FieldError>
            </Field>
            <Field data-invalid={Boolean(fieldProblem("visibility", localErrors, problem))}>
              <FieldLabel htmlFor="trip-visibility">Visibility</FieldLabel>
              <select
                aria-describedby="trip-visibility-description"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue={initialValues.visibility}
                id="trip-visibility"
                name="visibility"
              >
                <option value="private">Private</option>
                <option disabled={!allowPublic} value="public">
                  Public{allowPublic ? "" : " — verify email first"}
                </option>
              </select>
              <FieldDescription id="trip-visibility-description">
                Public Trips may appear in discovery. Membership and Share Links are separate.
              </FieldDescription>
              <FieldError>{fieldProblem("visibility", localErrors, problem)}</FieldError>
            </Field>
          </div>
        ) : null}
      </FieldGroup>

      <Button disabled={isPending} type="submit">
        {isPending ? "Saving Trip…" : submitLabel}
      </Button>
    </form>
  )
}
