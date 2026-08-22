import {
  type Database,
  type DatabaseTransaction,
  cities,
  itineraryItems,
  tripLegs,
  tripStops,
  trips,
  user,
} from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { evaluateTripSchedule } from "@globetrotter/domain"
import { asc, eq, sql } from "drizzle-orm"

import { bigintId, timestamp } from "../lib/http.ts"
import type { DatabaseExecutor, TripParticipantAccess } from "./trip-access.ts"
import { tripCapabilities } from "./trip-access.ts"

export type ReadDatabase = Database | DatabaseTransaction

export const currentDateExpression = sql<string>`(now() at time zone 'UTC')::date`

export const destinationCountExpression = sql<number>`(
  select count(distinct summary_stops."city_id")::int
  from "trip_stops" summary_stops
  where summary_stops."trip_id" = "trips"."id"
)`

export const estimatedCostExpression = sql<string>`coalesce((
  select sum(summary_items."estimated_cost")
  from "itinerary_items" summary_items
  inner join "trip_stops" summary_stops
    on summary_stops."id" = summary_items."trip_stop_id"
  where summary_stops."trip_id" = "trips"."id"
), 0)::numeric(18, 4) + coalesce((
  select sum(summary_legs."estimated_cost")
  from "trip_legs" summary_legs
  where summary_legs."trip_id" = "trips"."id"
), 0)::numeric(18, 4)`

export function tripStatus(
  startDate: string,
  endDate: string,
  currentDate: string,
): "upcoming" | "ongoing" | "completed" {
  if (currentDate < startDate) return "upcoming"
  if (currentDate < endDate) return "ongoing"
  return "completed"
}

export async function getTripCalculatedSummary(database: ReadDatabase, tripId: string) {
  const [summary] = await database
    .select({
      currentDate: currentDateExpression,
      destinationCount: destinationCountExpression,
      estimatedCost: estimatedCostExpression,
    })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1)

  if (!summary) throw new DomainError("TRIP_NOT_FOUND", "The trip was not found.")
  return summary
}

export async function protectedTripProjection(
  database: DatabaseExecutor,
  access: TripParticipantAccess,
) {
  const summary = await getTripCalculatedSummary(database, access.trip.id)
  const trip = access.trip

  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    coverImageKey: trip.coverImageKey,
    startDate: trip.startDate,
    endDate: trip.endDate,
    budgetLimit: trip.budgetLimit,
    estimatedCost: summary.estimatedCost,
    baseCurrency: trip.baseCurrency,
    visibility: trip.visibility,
    destinationCount: summary.destinationCount,
    status: tripStatus(trip.startDate, trip.endDate, summary.currentDate),
    version: trip.version,
    createdAt: timestamp(trip.createdAt),
    updatedAt: timestamp(trip.updatedAt),
    access: tripCapabilities(access.level),
  }
}

export async function itineraryProjection(database: ReadDatabase, tripId: string) {
  const stopRows = await database
    .select({
      city: {
        countryCode: cities.countryCode,
        id: cities.id,
        name: cities.name,
        timezone: cities.timezone,
      },
      stop: tripStops,
    })
    .from(tripStops)
    .innerJoin(cities, eq(cities.id, tripStops.cityId))
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.position))

  const itemRows = await database
    .select({ item: itineraryItems })
    .from(itineraryItems)
    .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
    .where(eq(tripStops.tripId, tripId))
    .orderBy(
      asc(itineraryItems.scheduledDate),
      sql`${itineraryItems.startTime} asc nulls last`,
      asc(itineraryItems.position),
    )

  const itemsByStop = new Map<string, ReturnType<typeof serializeItineraryItem>[]>()
  for (const { item } of itemRows) {
    const items = itemsByStop.get(item.tripStopId) ?? []
    items.push(serializeItineraryItem(item))
    itemsByStop.set(item.tripStopId, items)
  }

  return stopRows.map(({ city, stop }) => ({
    id: stop.id,
    position: stop.position,
    startDate: stop.startDate,
    endDate: stop.endDate,
    city: {
      id: bigintId(city.id),
      name: city.name,
      countryCode: city.countryCode,
      timezone: city.timezone,
    },
    notes: stop.notes,
    items: itemsByStop.get(stop.id) ?? [],
  }))
}

export async function travelLegProjection(database: ReadDatabase, tripId: string) {
  const legs = await database
    .select()
    .from(tripLegs)
    .where(eq(tripLegs.tripId, tripId))
    .orderBy(asc(tripLegs.departureAt), asc(tripLegs.id))

  return legs.map((leg) => ({
    id: leg.id,
    fromStopId: leg.fromStopId,
    toStopId: leg.toStopId,
    mode: leg.mode,
    title: leg.title,
    provider: leg.provider,
    reference: leg.reference,
    departureAt: timestamp(leg.departureAt),
    arrivalAt: timestamp(leg.arrivalAt),
    departureTimezone: leg.departureTimezone,
    arrivalTimezone: leg.arrivalTimezone,
    estimatedCost: leg.estimatedCost,
    originalCost: leg.originalCost,
    originalCurrency: leg.originalCurrency,
    exchangeRate: leg.exchangeRate,
    exchangeRateProvider: leg.exchangeRateProvider,
    exchangeRateAt: timestamp(leg.exchangeRateAt),
    notes: leg.notes,
  }))
}

export async function tripPlanningProjection(
  database: ReadDatabase,
  trip: Pick<typeof trips.$inferSelect, "id" | "startDate" | "endDate">,
) {
  const stops = await itineraryProjection(database, trip.id)
  const legs = await travelLegProjection(database, trip.id)
  const warnings = evaluateTripSchedule({
    trip: { startDate: trip.startDate, endDate: trip.endDate },
    stops: stops.map((stop) => ({
      id: stop.id,
      startDate: stop.startDate,
      endDate: stop.endDate,
      timezone: stop.city.timezone,
    })),
    legs: legs.map((leg) => ({
      id: leg.id,
      fromStopId: leg.fromStopId,
      toStopId: leg.toStopId,
      departureAt: leg.departureAt!,
      arrivalAt: leg.arrivalAt!,
    })),
    stays: stops.flatMap((stop) =>
      stop.items
        .filter((item) => item.kind === "stay" && item.endDate)
        .map((item) => ({
          id: item.id,
          stopId: stop.id,
          checkInDate: item.scheduledDate,
          checkOutDate: item.endDate!,
        })),
    ),
  })
  return { stops, legs, warnings }
}

export function serializeItineraryItem(item: typeof itineraryItems.$inferSelect) {
  return {
    id: item.id,
    sourceActivityId: bigintId(item.sourceActivityId),
    kind: item.kind,
    title: item.title,
    description: item.description,
    scheduledDate: item.scheduledDate,
    startTime: item.startTime,
    endDate: item.endDate,
    endTime: item.endTime,
    durationMinutes: item.durationMinutes,
    estimatedCost: item.estimatedCost,
    originalCost: item.originalCost,
    originalCurrency: item.originalCurrency,
    exchangeRate: item.exchangeRate,
    exchangeRateProvider: item.exchangeRateProvider,
    exchangeRateAt: timestamp(item.exchangeRateAt),
    position: item.position,
    notes: item.notes,
  }
}

async function publicFacingTripProjection(
  database: ReadDatabase,
  result: {
    owner: { id: string; image: string | null; name: string }
    trip: typeof trips.$inferSelect
  },
) {
  // Public/link responses are assembled from an allowlist. Never spread the
  // protected Trip aggregate here: budget limits and planning notes are private.
  const tripId = result.trip.id
  const summary = await getTripCalculatedSummary(database, tripId)
  const planning = await tripPlanningProjection(database, result.trip)

  return {
    id: result.trip.id,
    name: result.trip.name,
    description: result.trip.description,
    startDate: result.trip.startDate,
    endDate: result.trip.endDate,
    estimatedCost: summary.estimatedCost,
    baseCurrency: result.trip.baseCurrency,
    destinationCount: summary.destinationCount,
    status: tripStatus(result.trip.startDate, result.trip.endDate, summary.currentDate),
    version: result.trip.version,
    coverImageUrl: null,
    owner: {
      id: result.owner.id,
      name: result.owner.name,
      imageUrl: result.owner.image,
    },
    stops: planning.stops.map(({ notes: _notes, items, ...stop }) => ({
      ...stop,
      items: items.map(({ notes: _itemNotes, ...item }) => item),
    })),
    legs: planning.legs.map(({ notes: _notes, ...leg }) => leg),
    warnings: planning.warnings,
  }
}

export async function publicTripProjection(database: Database, tripId: string) {
  return database.transaction(async (transaction) => {
    const [result] = await transaction
      .select({
        owner: {
          id: user.id,
          image: user.image,
          name: user.name,
        },
        trip: trips,
      })
      .from(trips)
      .innerJoin(user, eq(user.id, trips.ownerId))
      .where(sql`${trips.id} = ${tripId} and ${trips.visibility} = 'public'`)
      .limit(1)
      .for("share", { of: trips })

    if (!result) throw new DomainError("TRIP_NOT_FOUND", "The public trip does not exist.")
    return publicFacingTripProjection(transaction, result)
  })
}

export async function linkSharedTripProjection(transaction: DatabaseTransaction, tripId: string) {
  const [result] = await transaction
    .select({
      owner: {
        id: user.id,
        image: user.image,
        name: user.name,
      },
      trip: trips,
    })
    .from(trips)
    .innerJoin(user, eq(user.id, trips.ownerId))
    .where(eq(trips.id, tripId))
    .limit(1)

  if (!result) throw new DomainError("TRIP_NOT_FOUND", "The trip was not found.")
  return publicFacingTripProjection(transaction, result)
}
