import { DomainError, type DomainErrorCode } from "@globetrotter/domain"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import type { ApiEnvironment } from "./context.ts"

const statusByCode = {
  CONFLICT: 409,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
} satisfies Record<DomainErrorCode, ContentfulStatusCode>

export function errorBody(code: DomainErrorCode | "INTERNAL_ERROR", message: string) {
  return { error: { code, message } }
}

export function handleApiError(error: Error, context: Context<ApiEnvironment>) {
  if (error instanceof DomainError) {
    return context.json(errorBody(error.code, error.message), statusByCode[error.code])
  }

  return context.json(errorBody("INTERNAL_ERROR", "An unexpected error occurred"), 500)
}
