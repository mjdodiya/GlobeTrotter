import { type DatabaseTransaction, cities, tripLegs, tripStops } from "@globetrotter/db"
import { DomainError, evaluateTripSchedule } from "@globetrotter/domain"
import { and, asc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { requireExpectedVersion, setTripEtag, timestamp } from "../lib/http.ts"
import {
  moneySchema,
  parseJson,
  parseValue,
  requireNonEmptyPatch,
  uuidSchema,
} from "../lib/validation.ts"
import { executeTripMutation, loadTripParticipantAccess } from "../services/trip-access.ts"

const legModeSchema = z.enum(["flight", "train", "bus", "car", "ferry", "walk", "other"])
const instantSchema = z.iso.datetime({ offset: true })

const createLegSchema = z
  .object({
    fromStopId: uuidSchema,
    toStopId: uuidSchema,
    mode: legModeSchema,
    title: z.string().trim().min(1).max(500),
    provider: z.string().trim().min(1).max(500).nullable().optional(),
    reference: z.string().trim().min(1).max(500).nullable().optional(),
    departureAt: instantSchema,
    arrivalAt: instantSchema,
    estimatedCost: moneySchema,
    notes: z.string().max(20_000).nullable().optional(),
  })
  .strict()

const updateLegSchema = createLegSchema.partial()

function serializeLeg(leg: typeof tripLegs.$inferSelect) {
  return {
    id: leg.id,
    tripId: leg.tripId,
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
  }
}

async function loadStopWithCity(transaction: DatabaseTransaction, tripId: string, stopId: string) {
  const [result] = await transaction
    .select({ stop: tripStops, timezone: cities.timezone })
    .from(tripStops)
    .innerJoin(cities, eq(cities.id, tripStops.cityId))
    .where(and(eq(tripStops.tripId, tripId), eq(tripStops.id, stopId)))
    .limit(1)
  if (!result) throw new DomainError("STOP_NOT_FOUND", "The Travel Leg stop was not found.")
  return result
}

async function loadLeg(transaction: DatabaseTransaction, tripId: string, legId: string) {
  const [leg] = await transaction
    .select()
    .from(tripLegs)
    .where(and(eq(tripLegs.tripId, tripId), eq(tripLegs.id, legId)))
    .limit(1)
  if (!leg) throw new DomainError("TRAVEL_LEG_NOT_FOUND", "The Travel Leg was not found.")
  return leg
}

function requireValidLeg(input: {
  arrivalAt: string
  departureAt: string
  fromStopId: string
  toStopId: string
}) {
  if (input.fromStopId === input.toStopId) {
    throw new DomainError(
      "TRAVEL_LEG_STOP_CONFLICT",
      "A Travel Leg must connect two different stops.",
    )
  }
  evaluateTripSchedule({
    legs: [{ id: "candidate", ...input }],
    stays: [],
    stops: [],
    trip: { startDate: "0001-01-01", endDate: "9999-12-31" },
  })
}

export function createLegRoutes(dependencies: ApiDependencies) {
  const routes = new Hono<ApiEnvironment>()

  routes.get("/:tripId/legs", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const access = await loadTripParticipantAccess(
      dependencies.database,
      tripId,
      context.var.session.user.id,
    )
    const legs = await dependencies.database
      .select()
      .from(tripLegs)
      .where(eq(tripLegs.tripId, tripId))
      .orderBy(asc(tripLegs.departureAt), asc(tripLegs.id))
    setTripEtag(context, access.trip.version)
    return context.json({ data: legs.map(serializeLeg) })
  })

  routes.post("/:tripId/legs", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const expectedVersion = requireExpectedVersion(context)
    const input = await parseJson(context, createLegSchema)
    requireValidLeg(input)

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "editing",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ transaction }) => {
        const from = await loadStopWithCity(transaction, tripId, input.fromStopId)
        const to = await loadStopWithCity(transaction, tripId, input.toStopId)
        const [leg] = await transaction
          .insert(tripLegs)
          .values({
            tripId,
            fromStopId: input.fromStopId,
            toStopId: input.toStopId,
            mode: input.mode,
            title: input.title,
            provider: input.provider ?? null,
            reference: input.reference ?? null,
            departureAt: new Date(input.departureAt),
            arrivalAt: new Date(input.arrivalAt),
            departureTimezone: from.timezone,
            arrivalTimezone: to.timezone,
            estimatedCost: input.estimatedCost,
            notes: input.notes ?? null,
          })
          .returning()
        if (!leg) throw new Error("Travel Leg insert did not return a row")
        return leg
      },
    )

    setTripEtag(context, result.version)
    return context.json({ data: { ...serializeLeg(result.data), version: result.version } }, 201)
  })

  routes.patch("/:tripId/legs/:legId", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const legId = parseValue(uuidSchema, context.req.param("legId"))
    const expectedVersion = requireExpectedVersion(context)
    const input = await parseJson(context, updateLegSchema)
    requireNonEmptyPatch(input)

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "editing",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ transaction }) => {
        const existing = await loadLeg(transaction, tripId, legId)
        const fromStopId = input.fromStopId ?? existing.fromStopId
        const toStopId = input.toStopId ?? existing.toStopId
        const departureAt = input.departureAt ?? existing.departureAt.toISOString()
        const arrivalAt = input.arrivalAt ?? existing.arrivalAt.toISOString()
        requireValidLeg({ fromStopId, toStopId, departureAt, arrivalAt })
        const from = await loadStopWithCity(transaction, tripId, fromStopId)
        const to = await loadStopWithCity(transaction, tripId, toStopId)
        const [leg] = await transaction
          .update(tripLegs)
          .set({
            ...(input.fromStopId !== undefined ? { fromStopId } : {}),
            ...(input.toStopId !== undefined ? { toStopId } : {}),
            ...(input.mode !== undefined ? { mode: input.mode } : {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.provider !== undefined ? { provider: input.provider } : {}),
            ...(input.reference !== undefined ? { reference: input.reference } : {}),
            ...(input.departureAt !== undefined
              ? { departureAt: new Date(input.departureAt) }
              : {}),
            ...(input.arrivalAt !== undefined ? { arrivalAt: new Date(input.arrivalAt) } : {}),
            ...(input.estimatedCost !== undefined ? { estimatedCost: input.estimatedCost } : {}),
            ...(input.estimatedCost !== undefined
              ? {
                  originalCost: null,
                  originalCurrency: null,
                  exchangeRate: null,
                  exchangeRateProvider: null,
                  exchangeRateAt: null,
                }
              : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            departureTimezone: from.timezone,
            arrivalTimezone: to.timezone,
            updatedAt: new Date(),
          })
          .where(and(eq(tripLegs.tripId, tripId), eq(tripLegs.id, legId)))
          .returning()
        if (!leg) throw new DomainError("TRAVEL_LEG_NOT_FOUND", "The Travel Leg was not found.")
        return leg
      },
    )
    setTripEtag(context, result.version)
    return context.json({ data: { ...serializeLeg(result.data), version: result.version } })
  })

  routes.delete("/:tripId/legs/:legId", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const legId = parseValue(uuidSchema, context.req.param("legId"))
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
        await loadLeg(transaction, tripId, legId)
        await transaction
          .delete(tripLegs)
          .where(and(eq(tripLegs.tripId, tripId), eq(tripLegs.id, legId)))
      },
    )
    setTripEtag(context, result.version)
    return context.body(null, 204)
  })

  return routes
}
