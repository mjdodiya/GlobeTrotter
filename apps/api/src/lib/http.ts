import { DomainError } from "@globetrotter/domain"
import type { Context } from "hono"
import { z } from "zod"

import { parseValue } from "./validation.ts"

export const paginationQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export function etag(version: number): string {
  return `"${version}"`
}

export function setTripEtag(context: Context, version: number): void {
  context.header("ETag", etag(version))
}

export function requireExpectedVersion(context: Context): number {
  const value = context.req.header("If-Match")
  if (!value) {
    throw new DomainError("PRECONDITION_REQUIRED", "Send the trip ETag in If-Match.")
  }

  const match = /^"([1-9]\d*)"$/.exec(value)
  const version = match ? Number(match[1]) : Number.NaN
  if (!Number.isSafeInteger(version)) {
    throw new DomainError("VALIDATION_ERROR", "If-Match must contain one quoted trip version.", {
      errors: { "If-Match": ['Expected a quoted positive integer such as "17".'] },
    })
  }

  return version
}

export function encodeCursor(value: Record<string, string>): string {
  return Buffer.from(JSON.stringify({ v: 1, ...value }), "utf8").toString("base64url")
}

export function decodeCursor<T>(cursor: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!cursor) return undefined

  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    return parseValue(schema, value)
  } catch (error) {
    if (error instanceof DomainError) throw error
    throw new DomainError("VALIDATION_ERROR", "The pagination cursor is invalid.", {
      errors: { cursor: ["Invalid or expired cursor."] },
    })
  }
}

export function timestamp(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

export function bigintId(value: number | bigint | null): string | null {
  return value === null ? null : String(value)
}
