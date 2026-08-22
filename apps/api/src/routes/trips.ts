import { itineraryItems, tripLegs, tripMembers, trips, tripStops } from "@globetrotter/db"
import { allocateEstimatedCosts, DomainError, requireValidTripPeriod } from "@globetrotter/domain"
import { and, desc, eq, gt, lt, lte, ne, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import {
  decodeCursor,
  encodeCursor,
  requireExpectedVersion,
  setTripEtag,
  timestamp,
} from "../lib/http.ts"
import {
  currencySchema,
  dateSchema,
  differenceInDays,
  moneySchema,
  parseJson,
  parseValue,
  requireNonEmptyPatch,
  uuidSchema,
} from "../lib/validation.ts"
import {
  executeTripMutation,
  loadCopyableTrip,
  loadTripParticipantAccess,
} from "../services/trip-access.ts"
import { copyTripAggregate } from "../services/trip-copy.ts"
import {
  currentDateExpression,
  destinationCountExpression,
  estimatedCostExpression,
  protectedTripProjection,
  tripPlanningProjection,
  tripStatus,
} from "../services/trip-read.ts"

const createTripSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    description: z.string().max(20_000).nullable().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    budgetLimit: moneySchema.nullable().optional(),
    baseCurrency: currencySchema,
    visibility: z.enum(["private", "public"]).default("private"),
  })
  .strict()

const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(20_000).nullable().optional(),
    coverImageKey: z.string().min(1).max(2_000).nullable().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    budgetLimit: moneySchema.nullable().optional(),
    baseCurrency: currencySchema.optional(),
    visibility: z.enum(["private", "public"]).optional(),
  })
  .strict()

const listTripsQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    scope: z.enum(["all", "owned", "member"]).default("all"),
    status: z.enum(["upcoming", "ongoing", "completed"]).optional(),
  })
  .strict()

const tripCursorSchema = z
  .object({
    v: z.literal(1),
    updatedAt: z.iso.datetime(),
    id: uuidSchema,
  })
  .strict()

function localDateAtTimezone(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(instant)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

const copyTripSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    startDate: dateSchema.optional(),
  })
  .strict()

export function createTripRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .get("/", async (context) => {
      const userId = context.var.session.user.id
      const query = parseValue(listTripsQuerySchema, context.req.query())
      const cursor = decodeCursor(query.cursor, tripCursorSchema)
      const membershipPredicate = sql<boolean>`exists (
      select 1 from ${tripMembers}
      where ${tripMembers.tripId} = ${trips.id}
        and ${tripMembers.userId} = ${userId}
    )`

      const scopePredicate =
        query.scope === "owned"
          ? eq(trips.ownerId, userId)
          : query.scope === "member"
            ? and(ne(trips.ownerId, userId), membershipPredicate)
            : or(eq(trips.ownerId, userId), membershipPredicate)

      const statusPredicate =
        query.status === "upcoming"
          ? gt(trips.startDate, currentDateExpression)
          : query.status === "ongoing"
            ? and(
                lte(trips.startDate, currentDateExpression),
                gt(trips.endDate, currentDateExpression),
              )
            : query.status === "completed"
              ? lte(trips.endDate, currentDateExpression)
              : undefined

      const cursorPredicate = cursor
        ? or(
            lt(trips.updatedAt, new Date(cursor.updatedAt)),
            and(eq(trips.updatedAt, new Date(cursor.updatedAt)), lt(trips.id, cursor.id)),
          )
        : undefined

      const rows = await dependencies.database
        .select({
          currentDate: currentDateExpression,
          trip: trips,
          destinationCount: destinationCountExpression,
          estimatedCost: estimatedCostExpression,
        })
        .from(trips)
        .where(and(scopePredicate, statusPredicate, cursorPredicate))
        .orderBy(desc(trips.updatedAt), desc(trips.id))
        .limit(query.limit + 1)

      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      const nextCursor =
        rows.length > query.limit && last
          ? encodeCursor({ updatedAt: last.trip.updatedAt.toISOString(), id: last.trip.id })
          : null

      return context.json({
        data: page.map(({ currentDate, destinationCount, estimatedCost, trip }) => ({
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destinationCount,
          estimatedCost,
          budgetLimit: trip.budgetLimit,
          baseCurrency: trip.baseCurrency,
          status: tripStatus(trip.startDate, trip.endDate, currentDate),
          visibility: trip.visibility,
          version: trip.version,
          updatedAt: timestamp(trip.updatedAt),
        })),
        meta: { nextCursor },
      })
    })

    .post("/", async (context) => {
      const input = await parseJson(context, createTripSchema)
      requireValidTripPeriod(input)

      const [trip] = await dependencies.database
        .insert(trips)
        .values({
          ownerId: context.var.session.user.id,
          name: input.name,
          description: input.description ?? null,
          startDate: input.startDate,
          endDate: input.endDate,
          budgetLimit: input.budgetLimit ?? null,
          baseCurrency: input.baseCurrency,
          visibility: input.visibility,
        })
        .returning()

      if (!trip) throw new Error("Trip insert did not return a row")

      setTripEtag(context, trip.version)
      context.header("Location", `/api/v1/trips/${trip.id}`)
      return context.json(
        {
          data: {
            id: trip.id,
            name: trip.name,
            description: trip.description,
            startDate: trip.startDate,
            endDate: trip.endDate,
            budgetLimit: trip.budgetLimit,
            baseCurrency: trip.baseCurrency,
            visibility: trip.visibility,
            version: trip.version,
            createdAt: timestamp(trip.createdAt),
            updatedAt: timestamp(trip.updatedAt),
          },
        },
        201,
      )
    })

    .get("/:tripId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const access = await loadTripParticipantAccess(
        dependencies.database,
        tripId,
        context.var.session.user.id,
      )
      const data = await protectedTripProjection(dependencies.database, access)
      setTripEtag(context, access.trip.version)
      return context.json({ data })
    })

    .patch("/:tripId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, updateTripSchema)
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
          if (input.visibility === "public" && context.var.session.user.emailVerified === false) {
            throw new DomainError("FORBIDDEN", "Verify your email before publishing a Trip.")
          }
          if (
            access.level !== "owner" &&
            (input.baseCurrency !== undefined || input.visibility !== undefined)
          ) {
            throw new DomainError(
              "FORBIDDEN",
              "Only the trip owner may change visibility or base currency.",
            )
          }

          const startDate = input.startDate ?? access.trip.startDate
          const endDate = input.endDate ?? access.trip.endDate
          requireValidTripPeriod({ startDate, endDate })

          if (input.startDate !== undefined || input.endDate !== undefined) {
            const [conflictingStop] = await transaction
              .select({ id: tripStops.id })
              .from(tripStops)
              .where(
                and(
                  eq(tripStops.tripId, tripId),
                  or(lt(tripStops.startDate, startDate), gt(tripStops.endDate, endDate)),
                ),
              )
              .limit(1)

            if (conflictingStop) {
              throw new DomainError(
                "TRIP_DATE_CONFLICT",
                "The new trip range would exclude one or more existing stops.",
              )
            }
          }

          if (input.baseCurrency !== undefined && input.baseCurrency !== access.trip.baseCurrency) {
            const [existingItem] = await transaction
              .select({ id: itineraryItems.id })
              .from(itineraryItems)
              .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
              .where(eq(tripStops.tripId, tripId))
              .limit(1)
            const [existingLeg] = await transaction
              .select({ id: tripLegs.id })
              .from(tripLegs)
              .where(eq(tripLegs.tripId, tripId))
              .limit(1)

            if (existingItem || existingLeg) {
              throw new DomainError(
                "TRIP_CURRENCY_LOCKED",
                "Base currency cannot change after itinerary costs have been added.",
              )
            }
          }

          if (input.coverImageKey) {
            const expectedPrefix = `users/${context.var.session.user.id}/trips/${tripId}/covers/`
            if (!input.coverImageKey.startsWith(expectedPrefix)) {
              throw new DomainError(
                "FORBIDDEN",
                "The cover image key does not belong to the authenticated user and trip.",
              )
            }
          }

          await transaction
            .update(trips)
            .set({
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.coverImageKey !== undefined ? { coverImageKey: input.coverImageKey } : {}),
              ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
              ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
              ...(input.budgetLimit !== undefined ? { budgetLimit: input.budgetLimit } : {}),
              ...(input.baseCurrency !== undefined ? { baseCurrency: input.baseCurrency } : {}),
              ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
              updatedAt: new Date(),
            })
            .where(eq(trips.id, tripId))

          const updatedAccess = await loadTripParticipantAccess(
            transaction,
            tripId,
            context.var.session.user.id,
          )
          return protectedTripProjection(transaction, updatedAccess)
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: result.data })
    })

    .delete("/:tripId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const expectedVersion = requireExpectedVersion(context)

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "ownership",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ transaction }) => {
          await transaction.delete(trips).where(eq(trips.id, tripId))
        },
      )

      setTripEtag(context, result.version)
      return context.body(null, 204)
    })

    .get("/:tripId/itinerary", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const access = await loadTripParticipantAccess(
        dependencies.database,
        tripId,
        context.var.session.user.id,
      )
      const planning = await tripPlanningProjection(dependencies.database, access.trip)
      setTripEtag(context, access.trip.version)
      return context.json({ data: { tripId, version: access.trip.version, ...planning } })
    })

    .get("/:tripId/budget", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const access = await loadTripParticipantAccess(
        dependencies.database,
        tripId,
        context.var.session.user.id,
      )

      const itemRows = await dependencies.database
        .select({ item: itineraryItems })
        .from(itineraryItems)
        .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
        .where(eq(tripStops.tripId, tripId))
      const legRows = await dependencies.database
        .select()
        .from(tripLegs)
        .where(eq(tripLegs.tripId, tripId))

      const itemEntries = itemRows.map(({ item }) => ({
        id: item.id,
        amount: item.estimatedCost,
        kind: item.kind === "stay" ? ("stay" as const) : ("item" as const),
        startDate: item.scheduledDate,
        ...(item.endDate ? { endDate: item.endDate } : {}),
      }))
      const legEntries = legRows.map((leg) => ({
        id: leg.id,
        amount: leg.estimatedCost,
        kind: "travel-leg" as const,
        startDate: localDateAtTimezone(leg.departureAt, leg.departureTimezone),
      }))
      const allocation = allocateEstimatedCosts([...itemEntries, ...legEntries])
      const tripDayCount = differenceInDays(access.trip.endDate, access.trip.startDate)
      const estimatedValue = Number(allocation.estimatedTotal)
      const budgetValue = access.trip.budgetLimit === null ? null : Number(access.trip.budgetLimit)
      const averageBudget = budgetValue === null ? null : budgetValue / tripDayCount

      const breakdown = {
        activity: "0.0000",
        transport: "0.0000",
        stay: "0.0000",
        meal: "0.0000",
        note: "0.0000",
        other: "0.0000",
      }
      for (const kind of Object.keys(breakdown) as Array<keyof typeof breakdown>) {
        const entries = [
          ...itemEntries.filter((_, index) => itemRows[index]!.item.kind === kind),
          ...(kind === "transport" ? legEntries : []),
        ]
        breakdown[kind] = allocateEstimatedCosts(entries).estimatedTotal
      }

      setTripEtag(context, access.trip.version)
      return context.json({
        data: {
          currency: access.trip.baseCurrency,
          budgetLimit: access.trip.budgetLimit,
          estimatedTotal: allocation.estimatedTotal,
          remaining: budgetValue === null ? null : (budgetValue - estimatedValue).toFixed(4),
          overBudget: budgetValue === null ? null : estimatedValue > budgetValue,
          tripDayCount,
          averageEstimatedCostPerDay: (estimatedValue / tripDayCount).toFixed(4),
          averageBudgetPerDay: averageBudget?.toFixed(4) ?? null,
          breakdown,
          days: allocation.days.map((day) => ({
            ...day,
            overAverageBudget:
              averageBudget === null ? null : Number(day.estimatedCost) > averageBudget,
          })),
          version: access.trip.version,
        },
      })
    })

    .post("/:tripId/copy", async (context) => {
      const sourceTripId = parseValue(uuidSchema, context.req.param("tripId"))
      const input = await parseJson(context, copyTripSchema)

      const copiedTrip = await dependencies.database.transaction(async (transaction) => {
        const source = await loadCopyableTrip(
          transaction,
          sourceTripId,
          context.var.session.user.id,
          "share",
        )
        return copyTripAggregate(transaction, source, context.var.session.user.id, input)
      })

      setTripEtag(context, copiedTrip.version)
      context.header("Location", `/api/v1/trips/${copiedTrip.id}`)
      return context.json({ data: { id: copiedTrip.id, version: copiedTrip.version } }, 201)
    })
}
