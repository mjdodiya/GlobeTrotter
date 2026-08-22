import { DomainError } from "../errors/domain-error.ts"

export type PlannedStop = {
  endDate: string
  id: string
  startDate: string
}

export type PlannedTravelLeg = {
  fromStopId: string
  id: string
  toStopId: string
}

export type StopReorderPlan = {
  affectedLegIds: string[]
  stops: PlannedStop[]
}

type StopReorderInput = {
  legs: readonly PlannedTravelLeg[]
  order: readonly string[]
  stops: readonly PlannedStop[]
}

const millisecondsPerDay = 86_400_000

function dateValue(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`)
}

function daysBetween(later: string, earlier: string): number {
  return (dateValue(later) - dateValue(earlier)) / millisecondsPerDay
}

function addDays(value: string, days: number): string {
  return new Date(dateValue(value) + days * millisecondsPerDay).toISOString().slice(0, 10)
}

export function planStopReorder(input: StopReorderInput): StopReorderPlan {
  const stopById = new Map(input.stops.map((stop) => [stop.id, stop]))
  const requested = new Set(input.order)
  const completePermutation =
    requested.size === input.order.length &&
    input.order.length === input.stops.length &&
    input.stops.every((stop) => requested.has(stop.id))

  if (!completePermutation) {
    throw new DomainError(
      "INVALID_STOP_ORDER",
      "The requested route must contain every stop exactly once.",
    )
  }
  if (input.stops.length === 0) return { affectedLegIds: [], stops: [] }

  const durations = new Map(
    input.stops.map((stop) => [stop.id, daysBetween(stop.endDate, stop.startDate)]),
  )
  // Durations travel with stops; gaps belong to route positions. This preserves
  // the user's overall trip cadence instead of silently attaching dates to cities.
  const gaps = input.stops.slice(0, -1).map((stop, index) => {
    const next = input.stops[index + 1]
    if (!next) return 0
    return daysBetween(next.startDate, stop.endDate)
  })

  let cursor = input.stops[0]!.startDate
  const stops = input.order.map((stopId, index) => {
    const source = stopById.get(stopId)!
    const duration = durations.get(stopId)!
    if (!Number.isInteger(duration) || duration <= 0) {
      throw new DomainError("VALIDATION_ERROR", "Every stop must have a valid travel period.")
    }

    const planned = { ...source, startDate: cursor, endDate: addDays(cursor, duration) }
    cursor = addDays(planned.endDate, gaps[index] ?? 0)
    return planned
  })

  const adjacency = new Set(
    stops.slice(0, -1).map((stop, index) => `${stop.id}:${stops[index + 1]!.id}`),
  )
  const affectedLegIds = input.legs
    // A Travel Leg is never retargeted implicitly: route changes surface the
    // exact records that the caller must explicitly resolve.
    .filter((leg) => !adjacency.has(`${leg.fromStopId}:${leg.toStopId}`))
    .map((leg) => leg.id)

  return { affectedLegIds, stops }
}
