import { DomainError } from "../errors/domain-error.ts"

export type TravelPeriod = {
  endDate: string
  startDate: string
}

export function requireValidTripPeriod(period: TravelPeriod): void {
  if (period.endDate <= period.startDate) {
    throw new DomainError("VALIDATION_ERROR", "The trip end date must be after its start date.", {
      errors: { endDate: ["Must be strictly greater than startDate."] },
    })
  }
}

export function requireStopWithinTripPeriod(trip: TravelPeriod, stop: TravelPeriod): void {
  if (stop.endDate <= stop.startDate) {
    throw new DomainError("VALIDATION_ERROR", "The stop end date must be after its start date.", {
      errors: { endDate: ["Must be strictly greater than startDate."] },
    })
  }

  if (stop.startDate < trip.startDate || stop.endDate > trip.endDate) {
    throw new DomainError("STOP_OUTSIDE_TRIP", "The stop must be within the trip's travel period.")
  }
}

export function requireItineraryItemWithinStopPeriod(
  scheduledDate: string,
  stop: TravelPeriod,
): void {
  if (scheduledDate < stop.startDate || scheduledDate >= stop.endDate) {
    throw new DomainError(
      "ITINERARY_ITEM_OUTSIDE_STOP",
      "The itinerary item's scheduled date must be within the stop's travel period.",
    )
  }
}
