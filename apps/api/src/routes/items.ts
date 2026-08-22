import { activities, itineraryItems } from "@globetrotter/db"
import {
  DomainError,
  requireItineraryItemWithinStopPeriod,
  requireStayWithinStopPeriod,
  snapshotCurrencyConversion,
} from "@globetrotter/domain"
import { and, asc, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { bigintId, requireExpectedVersion, setTripEtag } from "../lib/http.ts"
import {
  dateSchema,
  moneySchema,
  parseCatalogId,
  parseJson,
  parseValue,
  requireNonEmptyPatch,
  timeSchema,
  uuidSchema,
} from "../lib/validation.ts"
import { executeTripMutation, loadItineraryItem, loadTripStop } from "../services/trip-access.ts"

const itemKinds = ["activity", "transport", "stay", "meal", "note", "other"] as const

const commonItemFields = {
  scheduledDate: dateSchema,
  startTime: timeSchema.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  notes: z.string().max(20_000).nullable().optional(),
  insertAfterItemId: uuidSchema.nullable().optional(),
}

const catalogItemSchema = z
  .object({
    sourceActivityId: z.string(),
    estimatedCost: moneySchema.optional(),
    ...commonItemFields,
  })
  .strict()

const customItemSchema = z
  .object({
    kind: z.enum(itemKinds),
    title: z.string().trim().min(1).max(500),
    description: z.string().max(20_000).nullable().optional(),
    estimatedCost: moneySchema,
    endDate: dateSchema.optional(),
    endTime: timeSchema.nullable().optional(),
    ...commonItemFields,
  })
  .strict()

const createItemSchema = z.union([catalogItemSchema, customItemSchema])

const updateItemSchema = z
  .object({
    kind: z.enum(itemKinds).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    description: z.string().max(20_000).nullable().optional(),
    scheduledDate: dateSchema.optional(),
    startTime: timeSchema.nullable().optional(),
    endDate: dateSchema.nullable().optional(),
    endTime: timeSchema.nullable().optional(),
    durationMinutes: z.number().int().positive().nullable().optional(),
    estimatedCost: moneySchema.optional(),
    notes: z.string().max(20_000).nullable().optional(),
  })
  .strict()

const reorderItemsSchema = z
  .object({
    itemIds: z.array(uuidSchema).max(50_000),
  })
  .strict()

function serializeItem(item: typeof itineraryItems.$inferSelect) {
  return {
    id: item.id,
    tripStopId: item.tripStopId,
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
    exchangeRateAt: item.exchangeRateAt?.toISOString() ?? null,
    position: item.position,
    notes: item.notes,
  }
}

export function createItemRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .post("/:tripId/stops/:stopId/items", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, createItemSchema)

      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "editing",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ access, transaction }) => {
          const stop = await loadTripStop(transaction, tripId, stopId)
          requireItineraryItemWithinStopPeriod(input.scheduledDate, stop)

          const currentItems = await transaction
            .select({ id: itineraryItems.id, position: itineraryItems.position })
            .from(itineraryItems)
            .where(eq(itineraryItems.tripStopId, stopId))
            .orderBy(asc(itineraryItems.position))

          let insertionIndex = currentItems.length
          if (input.insertAfterItemId) {
            const afterIndex = currentItems.findIndex((item) => item.id === input.insertAfterItemId)
            if (afterIndex < 0) {
              throw new DomainError(
                "ITINERARY_ITEM_NOT_FOUND",
                "The insertion anchor does not belong to this stop.",
              )
            }
            insertionIndex = afterIndex + 1
          }

          const position = (currentItems.at(-1)?.position ?? 0) + 1_000
          let values: typeof itineraryItems.$inferInsert

          if ("sourceActivityId" in input) {
            const sourceActivityId = parseCatalogId(input.sourceActivityId, "sourceActivityId")
            const [activity] = await transaction
              .select()
              .from(activities)
              .where(eq(activities.id, sourceActivityId))
              .limit(1)

            if (!activity) {
              throw new DomainError(
                "CATALOG_ACTIVITY_NOT_FOUND",
                "The catalog activity does not exist.",
              )
            }
            if (activity.cityId !== stop.cityId) {
              throw new DomainError(
                "CATALOG_ACTIVITY_CITY_MISMATCH",
                "The catalog activity does not belong to the stop's city.",
              )
            }

            let estimatedCost = input.estimatedCost ?? null
            let conversion: ReturnType<typeof snapshotCurrencyConversion> | undefined
            if (estimatedCost === null && activity.currency === access.trip.baseCurrency) {
              estimatedCost = activity.estimatedCost
            } else if (
              estimatedCost === null &&
              activity.currency &&
              activity.estimatedCost &&
              dependencies.exchangeRates
            ) {
              const quote = await dependencies.exchangeRates.quote({
                fromCurrency: activity.currency,
                toCurrency: access.trip.baseCurrency,
              })
              conversion = snapshotCurrencyConversion({
                amount: activity.estimatedCost,
                currency: activity.currency,
                effectiveAt: quote.effectiveAt.toISOString(),
                provider: quote.provider,
                rate: quote.rate,
                targetCurrency: access.trip.baseCurrency,
              })
              estimatedCost = conversion.estimatedCost
            }
            if (estimatedCost === null) {
              throw new DomainError(
                "CURRENCY_CONVERSION_REQUIRED",
                `Provide estimatedCost in ${access.trip.baseCurrency}; no exchange rate is assumed.`,
              )
            }

            values = {
              tripStopId: stopId,
              sourceActivityId,
              kind: "activity",
              title: activity.name,
              description: activity.description,
              scheduledDate: input.scheduledDate,
              startTime: input.startTime ?? null,
              durationMinutes:
                input.durationMinutes === undefined
                  ? activity.defaultDurationMinutes
                  : input.durationMinutes,
              estimatedCost,
              originalCost: conversion?.originalCost ?? null,
              originalCurrency: conversion?.originalCurrency ?? null,
              exchangeRate: conversion?.exchangeRate ?? null,
              exchangeRateProvider: conversion?.exchangeRateProvider ?? null,
              exchangeRateAt: conversion ? new Date(conversion.exchangeRateAt) : null,
              position,
              notes: input.notes ?? null,
            }
          } else {
            if (input.kind === "stay") {
              if (!input.endDate) {
                throw new DomainError("VALIDATION_ERROR", "A Stay requires a checkout date.", {
                  errors: { endDate: ["Required when kind is stay."] },
                })
              }
              requireStayWithinStopPeriod(stop, {
                checkInDate: input.scheduledDate,
                checkInTime: input.startTime ?? null,
                checkOutDate: input.endDate,
                checkOutTime: input.endTime ?? null,
              })
            } else if (input.endDate !== undefined || input.endTime !== undefined) {
              throw new DomainError(
                "VALIDATION_ERROR",
                "Only a Stay may contain checkout fields.",
                {
                  errors: { endDate: ["Only supported when kind is stay."] },
                },
              )
            }
            values = {
              tripStopId: stopId,
              sourceActivityId: null,
              kind: input.kind,
              title: input.title,
              description: input.description ?? null,
              scheduledDate: input.scheduledDate,
              startTime: input.startTime ?? null,
              endDate: input.endDate ?? null,
              endTime: input.endTime ?? null,
              durationMinutes: input.durationMinutes ?? null,
              estimatedCost: input.estimatedCost,
              position,
              notes: input.notes ?? null,
            }
          }

          const [item] = await transaction.insert(itineraryItems).values(values).returning()
          if (!item) throw new Error("Itinerary item insert did not return a row")

          if (insertionIndex < currentItems.length) {
            const itemIds = currentItems.map((current) => current.id)
            itemIds.splice(insertionIndex, 0, item.id)
            for (const [index, id] of itemIds.entries()) {
              // The transaction owns one pg client; writes must remain sequential.
              // oxlint-disable-next-line no-await-in-loop
              await transaction
                .update(itineraryItems)
                .set({ position: (index + 1) * 1_000, updatedAt: new Date() })
                .where(and(eq(itineraryItems.id, id), eq(itineraryItems.tripStopId, stopId)))
            }
          }

          const [freshItem] = await transaction
            .select()
            .from(itineraryItems)
            .where(eq(itineraryItems.id, item.id))
            .limit(1)
          return freshItem ?? item
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { ...serializeItem(result.data), version: result.version } }, 201)
    })

    .patch("/:tripId/stops/:stopId/items/:itemId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const itemId = parseValue(uuidSchema, context.req.param("itemId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, updateItemSchema)
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
          const stop = await loadTripStop(transaction, tripId, stopId)
          const existing = await loadItineraryItem(transaction, stopId, itemId)

          const scheduledDate = input.scheduledDate ?? existing.scheduledDate
          requireItineraryItemWithinStopPeriod(scheduledDate, stop)
          const kind = input.kind ?? existing.kind
          const endDate = input.endDate === undefined ? existing.endDate : input.endDate
          const endTime = input.endTime === undefined ? existing.endTime : input.endTime
          const startTime = input.startTime === undefined ? existing.startTime : input.startTime
          if (kind === "stay") {
            if (!endDate) {
              throw new DomainError("VALIDATION_ERROR", "A Stay requires a checkout date.", {
                errors: { endDate: ["Required when kind is stay."] },
              })
            }
            requireStayWithinStopPeriod(stop, {
              checkInDate: scheduledDate,
              checkInTime: startTime,
              checkOutDate: endDate,
              checkOutTime: endTime,
            })
          } else if (endDate !== null || endTime !== null) {
            throw new DomainError("VALIDATION_ERROR", "Only a Stay may contain checkout fields.", {
              errors: { endDate: ["Only supported when kind is stay."] },
            })
          }
          if (existing.sourceActivityId !== null && input.kind && input.kind !== "activity") {
            throw new DomainError(
              "VALIDATION_ERROR",
              "A sourced itinerary item must retain kind activity.",
              { errors: { kind: ["Must remain activity while sourceActivityId is present."] } },
            )
          }

          const [updated] = await transaction
            .update(itineraryItems)
            .set({
              ...(input.kind !== undefined ? { kind: input.kind } : {}),
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.scheduledDate !== undefined ? { scheduledDate: input.scheduledDate } : {}),
              ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
              ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
              ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
              ...(input.durationMinutes !== undefined
                ? { durationMinutes: input.durationMinutes }
                : {}),
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
              updatedAt: new Date(),
            })
            .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripStopId, stopId)))
            .returning()
          if (!updated) {
            throw new DomainError("ITINERARY_ITEM_NOT_FOUND", "The itinerary item was not found.")
          }

          return updated
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { ...serializeItem(result.data), version: result.version } })
    })

    .delete("/:tripId/stops/:stopId/items/:itemId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const itemId = parseValue(uuidSchema, context.req.param("itemId"))
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
          await loadItineraryItem(transaction, stopId, itemId)
          await transaction
            .delete(itineraryItems)
            .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripStopId, stopId)))
        },
      )

      setTripEtag(context, result.version)
      return context.body(null, 204)
    })

    .put("/:tripId/stops/:stopId/items/order", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const stopId = parseValue(uuidSchema, context.req.param("stopId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, reorderItemsSchema)

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

          const existing = await transaction
            .select({ id: itineraryItems.id })
            .from(itineraryItems)
            .where(eq(itineraryItems.tripStopId, stopId))

          const requested = new Set(input.itemIds)
          const completePermutation =
            requested.size === input.itemIds.length &&
            existing.length === input.itemIds.length &&
            existing.every((item) => requested.has(item.id))
          if (!completePermutation) {
            throw new DomainError(
              "INVALID_ITINERARY_ITEM_ORDER",
              "itemIds must contain every item in this stop exactly once.",
            )
          }

          for (const [index, itemId] of input.itemIds.entries()) {
            // The transaction owns one pg client; writes must remain sequential.
            // oxlint-disable-next-line no-await-in-loop
            await transaction
              .update(itineraryItems)
              .set({ position: (index + 1) * 1_000, updatedAt: new Date() })
              .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripStopId, stopId)))
          }
        },
      )

      setTripEtag(context, result.version)
      return context.json({ data: { tripId, stopId, version: result.version } })
    })
}
