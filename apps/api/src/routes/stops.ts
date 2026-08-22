import {
  type DatabaseTransaction,
  activities,
  cities,
  itineraryItems,
  tripLegs,
  tripStops,
} from "@globetrotter/db"
import { DomainError, planStopReorder, requireStopWithinTripPeriod } from "@globetrotter/domain"
import { and, asc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { bigintId, requireExpectedVersion, setTripEtag } from "../lib/http.ts"
import {
  addDays,
  dateSchema,
  differenceInDays,
  parseCatalogId,
  parseJson,
  parseValue,
  requireNonEmptyPatch,
  uuidSchema,
} from "../lib/validation.ts"
import {
  executeTripMutation,
  loadTripParticipantAccess,
  loadTripStop,
  requireTripEditingAccess,
} from "../services/trip-access.ts"

const createStopSchema = z
  .object({
    cityId: z.string(),
    startDate: dateSchema,
    endDate: dateSchema,
    notes: z.string().max(20_000).nullable().optional(),
    insertAfterStopId: uuidSchema.nullable().optional(),
  })
  .strict()

const updateStopSchema = z
  .object({
    cityId: z.string().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    notes: z.string().max(20_000).nullable().optional(),
  })
  .strict()

const reorderStopsSchema = z
  .object({
    removeLegIds: z.array(uuidSchema).max(10_000).default([]),
    stopIds: z.array(uuidSchema).max(10_000),
  })
  .strict()

const previewStopOrderSchema = reorderStopsSchema.omit({ removeLegIds: true })

async function requireCity(transaction: DatabaseTransaction, cityId: number): Promise<void> {
  const [city] = await transaction
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.id, cityId))
    .limit(1)
  if (!city) {
    throw new DomainError("CATALOG_CITY_NOT_FOUND", "The selected catalog city does not exist.")
  }
}

async function requireNoStopOverlap(
  transaction: DatabaseTransaction,
  tripId: string,
  startDate: string,
  endDate: string,
  excludedStopId?: string,
): Promise<void> {
  const [overlap] = await transaction
    .select({ id: tripStops.id })
    .from(tripStops)
    .where(
      and(
        eq(tripStops.tripId, tripId),
        lt(tripStops.startDate, endDate),
        gt(tripStops.endDate, startDate),
        excludedStopId ? ne(tripStops.id, excludedStopId) : undefined,
      ),
    )
    .limit(1)

  if (overlap) {
    throw new DomainError("STOP_DATE_OVERLAP", "The requested stop overlaps another stop.")
  }
}

async function reorderStopPositions(
  transaction: DatabaseTransaction,
  tripId: string,
  stopIds: string[],
): Promise<void> {
  if (stopIds.length === 0) return

  const [maximum] = await transaction
    .select({ value: sql<number>`coalesce(max(${tripStops.position}), 0)::int` })
    .from(tripStops)
    .where(eq(tripStops.tripId, tripId))

  const temporaryBase = (maximum?.value ?? 0) + (stopIds.length + 1) * 1_000
  if (temporaryBase + stopIds.length >= 2_147_483_647) {
    throw new DomainError("CONFLICT", "The stop ordering metadata cannot be safely rewritten.")
  }

  for (const [index, stopId] of stopIds.entries()) {
    // The transaction owns one pg client; writes must remain sequential.
    // oxlint-disable-next-line no-await-in-loop
    await transaction
      .update(tripStops)
      .set({ position: temporaryBase + index, updatedAt: new Date() })
      .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
  }

  for (const [index, stopId] of stopIds.entries()) {
    // oxlint-disable-next-line no-await-in-loop
    await transaction
      .update(tripStops)
      .set({ position: (index + 1) * 1_000, updatedAt: new Date() })
      .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
  }
}

function serializeStop(stop: typeof tripStops.$inferSelect) {
  return {
    id: stop.id,
    tripId: stop.tripId,
    cityId: bigintId(stop.cityId),
    startDate: stop.startDate,
    endDate: stop.endDate,
    position: stop.position,
    notes: stop.notes,
  }
}

export function createStopRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .post("/:tripId/stops/order/preview", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const input = await parseJson(context, previewStopOrderSchema)
      const access = await loadTripParticipantAccess(
        dependencies.database,
        tripId,
        context.var.session.user.id,
      )
      requireTripEditingAccess(access)
      const [stops, legs] = await Promise.all([
        dependencies.database
          .select({ id: tripStops.id, startDate: tripStops.startDate, endDate: tripStops.endDate })
          .from(tripStops)
          .where(eq(tripStops.tripId, tripId))
          .orderBy(asc(tripStops.position)),
        dependencies.database
          .select({
            id: tripLegs.id,
            fromStopId: tripLegs.fromStopId,
            toStopId: tripLegs.toStopId,
          })
          .from(tripLegs)
          .where(eq(tripLegs.tripId, tripId))
          .orderBy(asc(tripLegs.id)),
      ])
      const plan = planStopReorder({ stops, legs, order: input.stopIds })
      setTripEtag(context, access.trip.version)
      return context.json({ data: plan })
    })

    .post("/:tripId/stops", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, createStopSchema)
      const cityId = parseCatalogId(input.cityId, "cityId")

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "editing",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ access, transaction }) => {
          requireStopWithinTripPeriod(
            { startDate: access.trip.startDate, endDate: access.trip.endDate },
            { startDate: input.startDate, endDate: input.endDate },
          )
          await requireCity(transaction, cityId)
          await requireNoStopOverlap(transaction, tripId, input.startDate, input.endDate)

          const currentStops = await transaction
            .select({ id: tripStops.id, position: tripStops.position })
            .from(tripStops)
            .where(eq(tripStops.tripId, tripId))
            .orderBy(asc(tripStops.position))

          let insertionIndex = currentStops.length
          if (input.insertAfterStopId) {
            const afterIndex = currentStops.findIndex((stop) => stop.id === input.insertAfterStopId)
            if (afterIndex < 0) {
              throw new DomainError(
                "STOP_NOT_FOUND",
                "The insertion anchor does not belong to this trip.",
              )
            }
            insertionIndex = afterIndex + 1
          }

          const appendPosition = (currentStops.at(-1)?.position ?? 0) + 1_000
          const [stop] = await transaction
            .insert(tripStops)
            .values({
              tripId,
              cityId,
              startDate: input.startDate,
              endDate: input.endDate,
              position: appendPosition,
              notes: input.notes ?? null,
            })
            .returning()
          if (!stop) throw new Error("Stop insert did not return a row")

          if (insertionIndex < currentStops.length) {
            const order = currentStops.map((current) => current.id)
            order.splice(insertionIndex, 0, stop.id)
            await reorderStopPositions(transaction, tripId, order)
          }

          const [freshStop] = await transaction
            .select()
            .from(tripStops)
            .where(eq(tripStops.id, stop.id))
            .limit(1)
          return freshStop ?? stop
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { ...serializeStop(result.data), version: result.version } }, 201)
    })

    .patch("/:tripId/stops/:stopId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, updateStopSchema)
      requireNonEmptyPatch(input)

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "editing",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ access, transaction }) => {
          const existing = await loadTripStop(transaction, tripId, stopId)

          const cityId =
            input.cityId === undefined ? existing.cityId : parseCatalogId(input.cityId, "cityId")
          const startDate = input.startDate ?? existing.startDate
          const endDate = input.endDate ?? existing.endDate

          requireStopWithinTripPeriod(
            { startDate: access.trip.startDate, endDate: access.trip.endDate },
            { startDate, endDate },
          )
          await requireNoStopOverlap(transaction, tripId, startDate, endDate, stopId)

          if (input.startDate !== undefined || input.endDate !== undefined) {
            const [conflictingItem] = await transaction
              .select({ id: itineraryItems.id })
              .from(itineraryItems)
              .where(
                and(
                  eq(itineraryItems.tripStopId, stopId),
                  or(
                    lt(itineraryItems.scheduledDate, startDate),
                    gte(itineraryItems.scheduledDate, endDate),
                  ),
                ),
              )
              .limit(1)

            if (conflictingItem) {
              throw new DomainError(
                "STOP_DATE_CONFLICT",
                "The new stop period would exclude one or more existing itinerary items.",
              )
            }
          }

          if (cityId !== existing.cityId) {
            await requireCity(transaction, cityId)
            const [conflictingActivity] = await transaction
              .select({ id: itineraryItems.id })
              .from(itineraryItems)
              .innerJoin(activities, eq(activities.id, itineraryItems.sourceActivityId))
              .where(and(eq(itineraryItems.tripStopId, stopId), ne(activities.cityId, cityId)))
              .limit(1)

            if (conflictingActivity) {
              throw new DomainError(
                "STOP_CATALOG_ACTIVITY_CITY_CONFLICT",
                "One or more sourced activities do not belong to the new city.",
              )
            }
          }

          const [updated] = await transaction
            .update(tripStops)
            .set({
              ...(input.cityId !== undefined ? { cityId } : {}),
              ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
              ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
              ...(input.notes !== undefined ? { notes: input.notes } : {}),
              updatedAt: new Date(),
            })
            .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
            .returning()
          if (!updated) throw new DomainError("STOP_NOT_FOUND", "The stop was not found.")

          return updated
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { ...serializeStop(result.data), version: result.version } })
    })

    .delete("/:tripId/stops/:stopId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const expectedVersion = requireExpectedVersion(context)

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "editing",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ transaction }) => {
          await loadTripStop(transaction, tripId, stopId)
          await transaction
            .delete(tripStops)
            .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
        },
      )

      setTripEtag(context, result.version)
      return context.body(null, 204)
    })

    .put("/:tripId/stops/order", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, reorderStopsSchema)

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "editing",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ transaction }) => {
          const existingStops = await transaction
            .select()
            .from(tripStops)
            .where(eq(tripStops.tripId, tripId))
            .orderBy(asc(tripStops.position))
          const legs = await transaction
            .select({
              id: tripLegs.id,
              fromStopId: tripLegs.fromStopId,
              toStopId: tripLegs.toStopId,
            })
            .from(tripLegs)
            .where(eq(tripLegs.tripId, tripId))
            .orderBy(asc(tripLegs.id))
          const items = await transaction
            .select({ item: itineraryItems })
            .from(itineraryItems)
            .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
            .where(eq(tripStops.tripId, tripId))
          const plan = planStopReorder({ stops: existingStops, legs, order: input.stopIds })
          const requestedRemovals = new Set(input.removeLegIds)
          const completeResolution =
            requestedRemovals.size === input.removeLegIds.length &&
            plan.affectedLegIds.length === input.removeLegIds.length &&
            plan.affectedLegIds.every((legId) => requestedRemovals.has(legId))
          if (!completeResolution) {
            throw new DomainError(
              "TRAVEL_LEG_RESOLUTION_REQUIRED",
              "Every affected Travel Leg must be explicitly removed before reordering.",
            )
          }

          if (input.removeLegIds.length > 0) {
            await transaction
              .delete(tripLegs)
              .where(and(eq(tripLegs.tripId, tripId), inArray(tripLegs.id, input.removeLegIds)))
          }

          // PostgreSQL checks non-overlap/unique constraints per statement. Move
          // every stop into a valid temporary schedule before writing the final
          // route, so swaps never require disabling database invariants.
          const temporaryBase = 1_000_000_000
          let temporaryDate = "1000-01-01"
          for (const [index, stop] of existingStops.entries()) {
            const duration = differenceInDays(stop.endDate, stop.startDate)
            const temporaryEndDate = addDays(temporaryDate, duration)
            // oxlint-disable-next-line no-await-in-loop
            await transaction
              .update(tripStops)
              .set({
                startDate: temporaryDate,
                endDate: temporaryEndDate,
                position: temporaryBase + index,
              })
              .where(and(eq(tripStops.tripId, tripId), eq(tripStops.id, stop.id)))
            temporaryDate = temporaryEndDate
          }

          const existingById = new Map(existingStops.map((stop) => [stop.id, stop]))
          for (const [index, stop] of plan.stops.entries()) {
            const existing = existingById.get(stop.id)!
            const offset = differenceInDays(stop.startDate, existing.startDate)
            for (const { item } of items.filter((row) => row.item.tripStopId === stop.id)) {
              // oxlint-disable-next-line no-await-in-loop
              await transaction
                .update(itineraryItems)
                .set({
                  scheduledDate: addDays(item.scheduledDate, offset),
                  ...(item.endDate ? { endDate: addDays(item.endDate, offset) } : {}),
                  updatedAt: new Date(),
                })
                .where(eq(itineraryItems.id, item.id))
            }
            // oxlint-disable-next-line no-await-in-loop
            await transaction
              .update(tripStops)
              .set({
                startDate: stop.startDate,
                endDate: stop.endDate,
                position: (index + 1) * 1_000,
                updatedAt: new Date(),
              })
              .where(and(eq(tripStops.tripId, tripId), eq(tripStops.id, stop.id)))
          }
          return plan
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { tripId, ...result.data, version: result.version } })
    })
}
