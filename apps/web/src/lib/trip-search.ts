import type { TripListFilters } from "./trip-api"

export type TripListSearch = TripListFilters
type TripScope = NonNullable<TripListSearch["scope"]>
type TripStatus = NonNullable<TripListSearch["status"]>

const scopes = new Set(["all", "owned", "member"])
const statuses = new Set(["upcoming", "ongoing", "completed"])

export function parseTripListSearch(value: Record<string, unknown>): TripListSearch {
  const scope = typeof value.scope === "string" && scopes.has(value.scope) ? value.scope : undefined
  const status =
    typeof value.status === "string" && statuses.has(value.status) ? value.status : undefined

  return {
    ...(scope && scope !== "all" ? { scope: scope as TripScope } : {}),
    ...(status ? { status: status as TripStatus } : {}),
  }
}

export function tripListSearch(scope: TripScope, status: TripStatus | "all"): TripListSearch {
  return {
    ...(scope !== "all" ? { scope } : {}),
    ...(status !== "all" ? { status } : {}),
  }
}
