import { DomainError, type DomainErrorCode } from "@globetrotter/domain"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import type { ApiEnvironment } from "./context.ts"

const statusByCode = {
  CATALOG_ACTIVITY_CITY_MISMATCH: 409,
  CATALOG_ACTIVITY_NOT_FOUND: 404,
  CATALOG_CITY_NOT_FOUND: 404,
  CONFLICT: 409,
  CURRENCY_CONVERSION_REQUIRED: 422,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  INVALID_ITINERARY_ITEM_ORDER: 409,
  INVALID_STOP_ORDER: 409,
  ITINERARY_ITEM_NOT_FOUND: 404,
  ITINERARY_ITEM_OUTSIDE_STOP: 409,
  NOT_FOUND: 404,
  OWNER_CANNOT_BE_MEMBER: 409,
  PRECONDITION_REQUIRED: 428,
  SHARE_LINK_NOT_FOUND: 404,
  STALE_TRIP_VERSION: 412,
  STOP_CATALOG_ACTIVITY_CITY_CONFLICT: 409,
  STOP_DATE_CONFLICT: 409,
  STOP_DATE_OVERLAP: 409,
  STOP_NOT_FOUND: 404,
  STOP_OUTSIDE_TRIP: 409,
  STAY_OUTSIDE_STOP: 409,
  STAY_TIME_CONFLICT: 409,
  TRIP_CURRENCY_LOCKED: 409,
  TRIP_DATE_CONFLICT: 409,
  TRIP_MEMBER_ALREADY_EXISTS: 409,
  TRIP_MEMBER_NOT_FOUND: 404,
  TRIP_NOT_FOUND: 404,
  TRAVEL_LEG_TIME_CONFLICT: 409,
  TRAVEL_LEG_NOT_FOUND: 404,
  TRAVEL_LEG_RESOLUTION_REQUIRED: 409,
  TRAVEL_LEG_STOP_CONFLICT: 409,
  UNAUTHENTICATED: 401,
  USER_NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
} satisfies Record<DomainErrorCode, ContentfulStatusCode>

const titleByCode = {
  CATALOG_ACTIVITY_CITY_MISMATCH: "Catalog activity belongs to another city",
  CATALOG_ACTIVITY_NOT_FOUND: "Catalog activity not found",
  CATALOG_CITY_NOT_FOUND: "Catalog city not found",
  CONFLICT: "Request conflicts with current state",
  CURRENCY_CONVERSION_REQUIRED: "Currency conversion required",
  FORBIDDEN: "Action forbidden",
  INVALID_INPUT: "Invalid request",
  INVALID_ITINERARY_ITEM_ORDER: "Invalid itinerary item order",
  INVALID_STOP_ORDER: "Invalid stop order",
  ITINERARY_ITEM_NOT_FOUND: "Itinerary item not found",
  ITINERARY_ITEM_OUTSIDE_STOP: "Itinerary item is outside the stop",
  NOT_FOUND: "Resource not found",
  OWNER_CANNOT_BE_MEMBER: "Trip owner cannot be a member",
  PRECONDITION_REQUIRED: "If-Match header required",
  SHARE_LINK_NOT_FOUND: "Share link not found",
  STALE_TRIP_VERSION: "Trip version is stale",
  STOP_CATALOG_ACTIVITY_CITY_CONFLICT: "Stop city conflicts with catalog activities",
  STOP_DATE_CONFLICT: "Stop dates conflict with itinerary items",
  STOP_DATE_OVERLAP: "Trip stops overlap",
  STOP_NOT_FOUND: "Trip stop not found",
  STOP_OUTSIDE_TRIP: "Trip stop is outside the trip",
  STAY_OUTSIDE_STOP: "Stay is outside the stop",
  STAY_TIME_CONFLICT: "Stay time conflict",
  TRIP_CURRENCY_LOCKED: "Trip currency is locked",
  TRIP_DATE_CONFLICT: "Trip dates conflict with existing stops",
  TRIP_MEMBER_ALREADY_EXISTS: "Trip member already exists",
  TRIP_MEMBER_NOT_FOUND: "Trip member not found",
  TRIP_NOT_FOUND: "Trip not found",
  TRAVEL_LEG_TIME_CONFLICT: "Travel Leg time conflict",
  TRAVEL_LEG_NOT_FOUND: "Travel Leg not found",
  TRAVEL_LEG_RESOLUTION_REQUIRED: "Travel Leg resolution required",
  TRAVEL_LEG_STOP_CONFLICT: "Travel Leg stop conflict",
  UNAUTHENTICATED: "Authentication required",
  USER_NOT_FOUND: "User not found",
  VALIDATION_ERROR: "Validation failed",
} satisfies Record<DomainErrorCode, string>

type ProblemOptions = {
  errors?: Record<string, string[]>
  requestId?: string
  status?: ContentfulStatusCode
  title?: string
}

export function errorBody(code: DomainErrorCode, detail: string, options: ProblemOptions = {}) {
  return {
    type: code,
    title: options.title ?? titleByCode[code],
    status: options.status ?? statusByCode[code],
    detail,
    ...(options.errors ? { errors: options.errors } : {}),
    ...(options.requestId ? { requestId: options.requestId } : {}),
  }
}

type PostgreSqlError = Error & {
  code?: string
  constraint?: string
}

function findPostgreSqlError(error: unknown): PostgreSqlError | undefined {
  let current = error
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    const candidate = current as PostgreSqlError
    if (candidate.code?.match(/^\d{5}$/)) return candidate
    current = candidate.cause
  }
  return undefined
}

function translateDatabaseError(error: unknown): DomainError | undefined {
  const databaseError = findPostgreSqlError(error)
  if (!databaseError) return undefined

  if (
    databaseError.code === "23P01" &&
    databaseError.constraint === "trip_stops_no_overlapping_dates_excl"
  ) {
    return new DomainError("STOP_DATE_OVERLAP", "The requested stop overlaps another stop.")
  }

  if (
    databaseError.code === "23505" &&
    databaseError.constraint === "trip_members_trip_id_user_id_pk"
  ) {
    return new DomainError("TRIP_MEMBER_ALREADY_EXISTS", "The user is already a trip member.")
  }

  return undefined
}

export function handleApiError(error: Error, context: Context<ApiEnvironment>) {
  const domainError = error instanceof DomainError ? error : translateDatabaseError(error)

  if (domainError) {
    const status = statusByCode[domainError.code]
    return context.json(
      errorBody(domainError.code, domainError.message, {
        ...(domainError.errors ? { errors: domainError.errors } : {}),
        requestId: context.var.requestId,
        status,
        ...(domainError.title ? { title: domainError.title } : {}),
      }),
      status,
    )
  }

  return context.json(
    {
      type: "INTERNAL_ERROR",
      title: "Unexpected server error",
      status: 500,
      detail: "An unexpected error occurred.",
      requestId: context.var.requestId,
    },
    500,
  )
}
