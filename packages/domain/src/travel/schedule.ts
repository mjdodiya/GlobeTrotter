import { DomainError } from "../errors/domain-error.ts"

export type ScheduleStop = {
  endDate: string
  id: string
  startDate: string
  timezone: string
}

export type ScheduleTravelLeg = {
  arrivalAt: string
  departureAt: string
  fromStopId: string
  id: string
  toStopId: string
}

export type ScheduleStay = {
  checkInDate: string
  checkOutDate: string
  id: string
  stopId: string
}

export type CompletenessWarning = {
  code:
    | "ACCOMMODATION_GAP"
    | "MISSING_TRAVEL_LEG"
    | "TRAVEL_LEG_ARRIVAL_OUTSIDE_DESTINATION"
    | "TRAVEL_LEG_DEPARTURE_OUTSIDE_ORIGIN"
    | "UNPLANNED_DAYS"
  message: string
  stopIds: string[]
}

type TripSchedule = {
  legs: readonly ScheduleTravelLeg[]
  stays: readonly ScheduleStay[]
  stops: readonly ScheduleStop[]
  trip: { endDate: string; startDate: string }
}

type StayPeriod = {
  checkInDate: string
  checkInTime: string | null
  checkOutDate: string
  checkOutTime: string | null
}

function localDateAtTimezone(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date(value))
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

export function requireStayWithinStopPeriod(
  stop: { endDate: string; startDate: string },
  stay: StayPeriod,
): void {
  const checkIn = `${stay.checkInDate}T${stay.checkInTime ?? "00:00:00"}`
  const checkOut = `${stay.checkOutDate}T${stay.checkOutTime ?? "00:00:00"}`
  if (checkOut <= checkIn) {
    throw new DomainError("STAY_TIME_CONFLICT", "A Stay must check out after check-in.")
  }
  if (
    stay.checkInDate < stop.startDate ||
    stay.checkInDate >= stop.endDate ||
    stay.checkOutDate > stop.endDate
  ) {
    // Stop end and Stay checkout are both exclusive boundaries, so checkout on
    // the stop's departure date is valid while a later checkout is not.
    throw new DomainError("STAY_OUTSIDE_STOP", "The Stay must be contained within its stop.")
  }
}

export function evaluateTripSchedule(schedule: TripSchedule): CompletenessWarning[] {
  // Impossible absolute chronology is a hard invariant. Coverage and local-date
  // mismatches below are warnings so partially planned trips remain editable.
  for (const leg of schedule.legs) {
    if (Date.parse(leg.arrivalAt) <= Date.parse(leg.departureAt)) {
      throw new DomainError(
        "TRAVEL_LEG_TIME_CONFLICT",
        "A Travel Leg must arrive after it departs as an absolute instant.",
      )
    }
  }

  const warnings: CompletenessWarning[] = []
  const stopById = new Map(schedule.stops.map((stop) => [stop.id, stop]))

  for (const leg of schedule.legs) {
    const from = stopById.get(leg.fromStopId)
    const to = stopById.get(leg.toStopId)
    if (from) {
      const departureDate = localDateAtTimezone(leg.departureAt, from.timezone)
      if (departureDate < from.startDate || departureDate > from.endDate) {
        warnings.push({
          code: "TRAVEL_LEG_DEPARTURE_OUTSIDE_ORIGIN",
          message: "The Travel Leg departs outside its origin stop.",
          stopIds: [from.id],
        })
      }
    }
    if (to) {
      const arrivalDate = localDateAtTimezone(leg.arrivalAt, to.timezone)
      if (arrivalDate < to.startDate || arrivalDate >= to.endDate) {
        warnings.push({
          code: "TRAVEL_LEG_ARRIVAL_OUTSIDE_DESTINATION",
          message: "The Travel Leg arrives outside its destination stop.",
          stopIds: [to.id],
        })
      }
    }
  }
  const legPairs = new Set(schedule.legs.map((leg) => `${leg.fromStopId}:${leg.toStopId}`))
  let cursor = schedule.trip.startDate

  for (const [index, stop] of schedule.stops.entries()) {
    if (cursor < stop.startDate) {
      warnings.push({
        code: "UNPLANNED_DAYS",
        message: `The trip has an unplanned period from ${cursor} to ${stop.startDate}.`,
        stopIds: index === 0 ? [stop.id] : [schedule.stops[index - 1]!.id, stop.id],
      })
    }

    const previous = schedule.stops[index - 1]
    if (previous && !legPairs.has(`${previous.id}:${stop.id}`)) {
      warnings.push({
        code: "MISSING_TRAVEL_LEG",
        message: "Adjacent stops do not have a Travel Leg.",
        stopIds: [previous.id, stop.id],
      })
    }
    cursor = stop.endDate
  }

  if (cursor < schedule.trip.endDate) {
    warnings.push({
      code: "UNPLANNED_DAYS",
      message: `The trip has an unplanned period from ${cursor} to ${schedule.trip.endDate}.`,
      stopIds: schedule.stops.at(-1) ? [schedule.stops.at(-1)!.id] : [],
    })
  }

  for (const stop of schedule.stops) {
    const stays = schedule.stays.filter((stay) => stay.stopId === stop.id)
    let date = stop.startDate
    let hasGap = false
    while (date < stop.endDate) {
      if (!stays.some((stay) => stay.checkInDate <= date && stay.checkOutDate > date)) {
        hasGap = true
        break
      }
      const timestamp = Date.parse(`${date}T00:00:00.000Z`) + 86_400_000
      date = new Date(timestamp).toISOString().slice(0, 10)
    }
    if (hasGap) {
      warnings.push({
        code: "ACCOMMODATION_GAP",
        message: "One or more nights in this stop do not have a Stay.",
        stopIds: [stop.id],
      })
    }
  }

  return warnings
}
