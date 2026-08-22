import { randomUUID } from "node:crypto"

import {
  type DatabaseTransaction,
  itineraryItems,
  tripLegs,
  tripStops,
  trips,
} from "@globetrotter/db"
import { asc, eq } from "drizzle-orm"

import { addDays, differenceInDays } from "../lib/validation.ts"
import type { TripRow } from "./trip-access.ts"

export type CopyTripInput = {
  name?: string | undefined
  startDate?: string | undefined
}

export async function copyTripAggregate(
  transaction: DatabaseTransaction,
  source: TripRow,
  ownerId: string,
  input: CopyTripInput,
) {
  const offsetDays = input.startDate ? differenceInDays(input.startDate, source.startDate) : 0

  const [newTrip] = await transaction
    .insert(trips)
    .values({
      ownerId,
      name: input.name ?? source.name,
      description: source.description,
      coverImageKey: null,
      startDate: addDays(source.startDate, offsetDays),
      endDate: addDays(source.endDate, offsetDays),
      budgetLimit: source.budgetLimit,
      baseCurrency: source.baseCurrency,
      visibility: "private",
      version: 1,
      copiedFromTripId: source.id,
    })
    .returning()

  if (!newTrip) throw new Error("Trip copy insert did not return a row")

  const sourceStops = await transaction
    .select()
    .from(tripStops)
    .where(eq(tripStops.tripId, source.id))
    .orderBy(asc(tripStops.position))

  const stopIdMap = new Map<string, string>()
  if (sourceStops.length > 0) {
    await transaction.insert(tripStops).values(
      sourceStops.map((stop) => {
        const id = randomUUID()
        stopIdMap.set(stop.id, id)
        return {
          id,
          tripId: newTrip.id,
          cityId: stop.cityId,
          startDate: addDays(stop.startDate, offsetDays),
          endDate: addDays(stop.endDate, offsetDays),
          position: stop.position,
          notes: stop.notes,
        }
      }),
    )
  }

  const sourceItems = await transaction
    .select({ item: itineraryItems })
    .from(itineraryItems)
    .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
    .where(eq(tripStops.tripId, source.id))

  if (sourceItems.length > 0) {
    await transaction.insert(itineraryItems).values(
      sourceItems.map(({ item }) => {
        const tripStopId = stopIdMap.get(item.tripStopId)
        if (!tripStopId) throw new Error("Trip copy could not map an itinerary item's stop")

        return {
          tripStopId,
          sourceActivityId: item.sourceActivityId,
          kind: item.kind,
          title: item.title,
          description: item.description,
          scheduledDate: addDays(item.scheduledDate, offsetDays),
          startTime: item.startTime,
          endDate: item.endDate,
          endTime: item.endTime,
          durationMinutes: item.durationMinutes,
          estimatedCost: item.estimatedCost,
          originalCost: item.originalCost,
          originalCurrency: item.originalCurrency,
          exchangeRate: item.exchangeRate,
          exchangeRateProvider: item.exchangeRateProvider,
          exchangeRateAt: item.exchangeRateAt,
          position: item.position,
          notes: item.notes,
        }
      }),
    )
  }

  const sourceLegs = await transaction.select().from(tripLegs).where(eq(tripLegs.tripId, source.id))

  if (sourceLegs.length > 0) {
    await transaction.insert(tripLegs).values(
      sourceLegs.map((leg) => {
        const fromStopId = stopIdMap.get(leg.fromStopId)
        const toStopId = stopIdMap.get(leg.toStopId)
        if (!fromStopId || !toStopId) {
          throw new Error("Trip copy could not map a Travel Leg's stops")
        }
        const offsetMilliseconds = offsetDays * 86_400_000
        return {
          tripId: newTrip.id,
          fromStopId,
          toStopId,
          mode: leg.mode,
          title: leg.title,
          provider: leg.provider,
          reference: leg.reference,
          departureAt: new Date(leg.departureAt.valueOf() + offsetMilliseconds),
          arrivalAt: new Date(leg.arrivalAt.valueOf() + offsetMilliseconds),
          departureTimezone: leg.departureTimezone,
          arrivalTimezone: leg.arrivalTimezone,
          estimatedCost: leg.estimatedCost,
          originalCost: leg.originalCost,
          originalCurrency: leg.originalCurrency,
          exchangeRate: leg.exchangeRate,
          exchangeRateProvider: leg.exchangeRateProvider,
          exchangeRateAt: leg.exchangeRateAt,
          notes: leg.notes,
        }
      }),
    )
  }

  return newTrip
}
