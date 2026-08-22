export type DomainErrorCode =
  | "CATALOG_ACTIVITY_CITY_MISMATCH"
  | "CATALOG_ACTIVITY_NOT_FOUND"
  | "CATALOG_CITY_NOT_FOUND"
  | "CONFLICT"
  | "CURRENCY_CONVERSION_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_ITINERARY_ITEM_ORDER"
  | "INVALID_STOP_ORDER"
  | "ITINERARY_ITEM_NOT_FOUND"
  | "ITINERARY_ITEM_OUTSIDE_STOP"
  | "TRIP_MEMBER_ALREADY_EXISTS"
  | "TRIP_MEMBER_NOT_FOUND"
  | "OWNER_CANNOT_BE_MEMBER"
  | "PRECONDITION_REQUIRED"
  | "SHARE_LINK_NOT_FOUND"
  | "STALE_TRIP_VERSION"
  | "STOP_CATALOG_ACTIVITY_CITY_CONFLICT"
  | "STOP_DATE_CONFLICT"
  | "STOP_DATE_OVERLAP"
  | "STOP_NOT_FOUND"
  | "STOP_OUTSIDE_TRIP"
  | "STAY_OUTSIDE_STOP"
  | "STAY_TIME_CONFLICT"
  | "TRIP_CURRENCY_LOCKED"
  | "TRIP_DATE_CONFLICT"
  | "TRIP_NOT_FOUND"
  | "TRAVEL_LEG_TIME_CONFLICT"
  | "TRAVEL_LEG_NOT_FOUND"
  | "TRAVEL_LEG_RESOLUTION_REQUIRED"
  | "TRAVEL_LEG_STOP_CONFLICT"
  | "UNAUTHENTICATED"
  | "USER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly errors: Record<string, string[]> | undefined
  readonly title: string | undefined

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: ErrorOptions & { errors?: Record<string, string[]>; title?: string },
  ) {
    super(message, options)
    this.name = "DomainError"
    this.code = code
    this.errors = options?.errors
    this.title = options?.title
  }
}
