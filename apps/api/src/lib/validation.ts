import { DomainError } from "@globetrotter/domain"
import type { Context } from "hono"
import { z } from "zod"

export const uuidSchema = z.uuid("Must be a valid UUID.")
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must use YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
  }, "Invalid date.")
export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, "Must use HH:mm:ss.")
export const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Must contain exactly three uppercase characters.")
export const moneySchema = z
  .string()
  .regex(/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/, "Must be a non-negative decimal string.")
export const positiveCatalogIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Must be a positive integer ID.")

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "request"
    ;(errors[field] ??= []).push(issue.message)
  }

  return errors
}

export function validationError(error: z.ZodError): DomainError {
  return new DomainError("VALIDATION_ERROR", "One or more request values are invalid.", {
    errors: fieldErrors(error),
  })
}

export function parseValue<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw validationError(result.error)
  return result.data
}

export async function parseJson<T>(context: Context, schema: z.ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await context.req.json<unknown>()
  } catch {
    throw new DomainError("INVALID_INPUT", "The request body must contain valid JSON.")
  }

  return parseValue(schema, body)
}

export function parseCatalogId(value: string, field = "id"): number {
  const parsed = parseValue(positiveCatalogIdSchema, value)
  const id = Number(parsed)

  if (!Number.isSafeInteger(id)) {
    throw new DomainError("VALIDATION_ERROR", "The catalog ID is outside the supported range.", {
      errors: { [field]: ["ID is outside the supported range."] },
    })
  }

  return id
}

export function requireNonEmptyPatch(value: Record<string, unknown>): void {
  if (Object.keys(value).length === 0) {
    throw new DomainError("VALIDATION_ERROR", "At least one field must be supplied.", {
      errors: { request: ["At least one field must be supplied."] },
    })
  }
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function differenceInDays(later: string, earlier: string): number {
  return (
    (Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) / 86_400_000
  )
}
