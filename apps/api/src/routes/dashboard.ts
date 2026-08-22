import { cities, tripMembers, tripStops, trips } from "@globetrotter/db"
import { and, asc, desc, eq, gt, lte, or, sql } from "drizzle-orm"
import { Hono } from "hono"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { bigintId } from "../lib/http.ts"
import { requireSession } from "../middleware/authentication.ts"
import {
  currentDateExpression,
  destinationCountExpression,
  estimatedCostExpression,
  tripStatus,
} from "../services/trip-read.ts"

function dashboardTripSummary(row: {
  currentDate: string
  destinationCount: number
  estimatedCost: string
  trip: typeof trips.$inferSelect
}) {
  return {
    id: row.trip.id,
    name: row.trip.name,
    startDate: row.trip.startDate,
    endDate: row.trip.endDate,
    destinationCount: row.destinationCount,
    estimatedCost: row.estimatedCost,
    budgetLimit: row.trip.budgetLimit,
    baseCurrency: row.trip.baseCurrency,
    status: tripStatus(row.trip.startDate, row.trip.endDate, row.currentDate),
    version: row.trip.version,
  }
}

export function createDashboardRoutes(dependencies: ApiDependencies) {
  const routes = new Hono<ApiEnvironment>()
  routes.use("*", requireSession(dependencies))

  routes.get("/", async (context) => {
    const userId = context.var.session.user.id
    const accessible = or(
      eq(trips.ownerId, userId),
      sql<boolean>`exists (
        select 1 from ${tripMembers}
        where ${tripMembers.tripId} = ${trips.id}
          and ${tripMembers.userId} = ${userId}
      )`,
    )

    const summarySelection = {
      currentDate: currentDateExpression,
      trip: trips,
      destinationCount: destinationCountExpression,
      estimatedCost: estimatedCostExpression,
    }

    const [upcomingRows, recentRows, popularCities, budgetHighlights] = await Promise.all([
      dependencies.database
        .select(summarySelection)
        .from(trips)
        .where(and(accessible, gt(trips.startDate, currentDateExpression)))
        .orderBy(asc(trips.startDate), asc(trips.id))
        .limit(5),
      dependencies.database
        .select(summarySelection)
        .from(trips)
        .where(and(accessible, lte(trips.endDate, currentDateExpression)))
        .orderBy(desc(trips.endDate), desc(trips.id))
        .limit(5),
      dependencies.database
        .select({
          id: cities.id,
          name: cities.name,
          tripCount: sql<number>`count(distinct ${tripStops.tripId})::int`,
        })
        .from(tripStops)
        .innerJoin(trips, eq(trips.id, tripStops.tripId))
        .innerJoin(cities, eq(cities.id, tripStops.cityId))
        .where(accessible)
        .groupBy(cities.id, cities.name)
        .orderBy(desc(sql`count(distinct ${tripStops.tripId})`), asc(cities.name))
        .limit(5),
      dependencies.database
        .select({
          currency: trips.baseCurrency,
          tripCount: sql<number>`count(*)::int`,
          totalBudget: sql<string>`coalesce(sum("trips"."budget_limit"), 0)::numeric(18, 4)`,
          totalEstimatedCost: sql<string>`coalesce(sum((
            select coalesce(sum(dashboard_items."estimated_cost"), 0)
            from "itinerary_items" dashboard_items
            inner join "trip_stops" dashboard_stops
              on dashboard_stops."id" = dashboard_items."trip_stop_id"
            where dashboard_stops."trip_id" = "trips"."id"
          ) + (
            select coalesce(sum(dashboard_legs."estimated_cost"), 0)
            from "trip_legs" dashboard_legs
            where dashboard_legs."trip_id" = "trips"."id"
          )), 0)::numeric(18, 4)`,
        })
        .from(trips)
        .where(accessible)
        .groupBy(trips.baseCurrency)
        .orderBy(asc(trips.baseCurrency)),
    ])

    return context.json({
      data: {
        upcomingTrips: upcomingRows.map(dashboardTripSummary),
        recentTrips: recentRows.map(dashboardTripSummary),
        popularCities: popularCities.map((city) => ({
          id: bigintId(city.id),
          name: city.name,
          tripCount: city.tripCount,
        })),
        budgetHighlights: { currencies: budgetHighlights },
      },
    })
  })

  return routes
}
