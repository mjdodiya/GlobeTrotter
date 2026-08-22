import { itineraryItems, tripLegs, tripStops } from "@globetrotter/db"
import { DomainError, snapshotCurrencyConversion } from "@globetrotter/domain"
import { and, asc, eq, isNotNull } from "drizzle-orm"
import { Hono } from "hono"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { requireExpectedVersion, setTripEtag } from "../lib/http.ts"
import { parseValue, uuidSchema } from "../lib/validation.ts"
import {
  executeTripMutation,
  loadTripParticipantAccess,
  requireCurrentVersion,
  requireTripEditingAccess,
} from "../services/trip-access.ts"

type RefreshableCost = {
  id: string
  originalCost: string
  originalCurrency: string
  previousEstimatedCost: string
  type: "itineraryItem" | "travelLeg"
}

type RateChange = RefreshableCost & {
  exchangeRate: string
  exchangeRateAt: string
  exchangeRateProvider: string
  refreshedEstimatedCost: string
}

async function loadRefreshableCosts(dependencies: ApiDependencies, tripId: string) {
  const itemRows = await dependencies.database
    .select({
      id: itineraryItems.id,
      originalCost: itineraryItems.originalCost,
      originalCurrency: itineraryItems.originalCurrency,
      previousEstimatedCost: itineraryItems.estimatedCost,
    })
    .from(itineraryItems)
    .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
    .where(
      and(
        eq(tripStops.tripId, tripId),
        isNotNull(itineraryItems.originalCost),
        isNotNull(itineraryItems.originalCurrency),
      ),
    )
    .orderBy(asc(itineraryItems.id))

  const legRows = await dependencies.database
    .select({
      id: tripLegs.id,
      originalCost: tripLegs.originalCost,
      originalCurrency: tripLegs.originalCurrency,
      previousEstimatedCost: tripLegs.estimatedCost,
    })
    .from(tripLegs)
    .where(
      and(
        eq(tripLegs.tripId, tripId),
        isNotNull(tripLegs.originalCost),
        isNotNull(tripLegs.originalCurrency),
      ),
    )
    .orderBy(asc(tripLegs.id))

  return [
    ...itemRows.map((row) => ({ ...row, type: "itineraryItem" as const })),
    ...legRows.map((row) => ({ ...row, type: "travelLeg" as const })),
  ].filter(
    (row): row is RefreshableCost => row.originalCost !== null && row.originalCurrency !== null,
  )
}

async function calculateRateChanges(
  dependencies: ApiDependencies,
  tripId: string,
  baseCurrency: string,
): Promise<RateChange[]> {
  if (!dependencies.exchangeRates) {
    throw new DomainError(
      "CURRENCY_CONVERSION_REQUIRED",
      "Exchange-rate refresh is not configured on this server.",
    )
  }

  const costs = await loadRefreshableCosts(dependencies, tripId)
  const quotes = new Map<string, Awaited<ReturnType<typeof dependencies.exchangeRates.quote>>>()
  const changes: RateChange[] = []

  for (const cost of costs) {
    let quote = quotes.get(cost.originalCurrency)
    if (!quote) {
      // Providers may rate-limit; fetch each unique currency sequentially.
      // oxlint-disable-next-line no-await-in-loop
      quote = await dependencies.exchangeRates.quote({
        fromCurrency: cost.originalCurrency,
        toCurrency: baseCurrency,
      })
      quotes.set(cost.originalCurrency, quote)
    }
    const snapshot = snapshotCurrencyConversion({
      amount: cost.originalCost,
      currency: cost.originalCurrency,
      effectiveAt: quote.effectiveAt.toISOString(),
      provider: quote.provider,
      rate: quote.rate,
      targetCurrency: baseCurrency,
    })
    changes.push({
      ...cost,
      exchangeRate: snapshot.exchangeRate,
      exchangeRateAt: snapshot.exchangeRateAt,
      exchangeRateProvider: snapshot.exchangeRateProvider,
      refreshedEstimatedCost: snapshot.estimatedCost,
    })
  }

  return changes
}

function serializeChange(change: RateChange) {
  return {
    id: change.id,
    type: change.type,
    previousEstimatedCost: change.previousEstimatedCost,
    refreshedEstimatedCost: change.refreshedEstimatedCost,
    originalCost: change.originalCost,
    originalCurrency: change.originalCurrency,
    exchangeRate: change.exchangeRate,
    exchangeRateProvider: change.exchangeRateProvider,
    exchangeRateAt: change.exchangeRateAt,
  }
}

export function createRateRoutes(dependencies: ApiDependencies) {
  const routes = new Hono<ApiEnvironment>()

  routes.post("/:tripId/rates/preview", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const access = await loadTripParticipantAccess(
      dependencies.database,
      tripId,
      context.var.session.user.id,
    )
    requireTripEditingAccess(access)

    // Preview is deliberately read-only: a user must explicitly commit the same
    // Trip version before historical planning costs are replaced.
    const changes = await calculateRateChanges(dependencies, tripId, access.trip.baseCurrency)
    setTripEtag(context, access.trip.version)
    return context.json({
      data: { baseCurrency: access.trip.baseCurrency, changes: changes.map(serializeChange) },
    })
  })

  routes.post("/:tripId/rates/refresh", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const expectedVersion = requireExpectedVersion(context)
    const access = await loadTripParticipantAccess(
      dependencies.database,
      tripId,
      context.var.session.user.id,
    )
    requireTripEditingAccess(access)
    requireCurrentVersion(access, expectedVersion)

    // Network I/O happens before opening the database transaction. The mutation
    // rechecks the version under a row lock, so a concurrent edit makes this stale.
    const changes = await calculateRateChanges(dependencies, tripId, access.trip.baseCurrency)
    if (changes.length === 0) {
      setTripEtag(context, access.trip.version)
      return context.json({
        data: { baseCurrency: access.trip.baseCurrency, changes: [], version: access.trip.version },
      })
    }

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "editing",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ transaction }) => {
        for (const change of changes) {
          const values = {
            estimatedCost: change.refreshedEstimatedCost,
            exchangeRate: change.exchangeRate,
            exchangeRateAt: new Date(change.exchangeRateAt),
            exchangeRateProvider: change.exchangeRateProvider,
            updatedAt: new Date(),
          }
          if (change.type === "itineraryItem") {
            // The transaction owns one pg client; writes must remain sequential.
            // oxlint-disable-next-line no-await-in-loop
            await transaction
              .update(itineraryItems)
              .set(values)
              .where(eq(itineraryItems.id, change.id))
          } else {
            // oxlint-disable-next-line no-await-in-loop
            await transaction.update(tripLegs).set(values).where(eq(tripLegs.id, change.id))
          }
        }
      },
    )

    setTripEtag(context, result.version)
    return context.json({
      data: {
        baseCurrency: access.trip.baseCurrency,
        changes: changes.map(serializeChange),
        version: result.version,
      },
    })
  })

  return routes
}
