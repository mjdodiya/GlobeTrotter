import { trips, user } from "@globetrotter/db"
import { and, desc, eq, lt, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { decodeCursor, encodeCursor, setTripEtag } from "../lib/http.ts"
import {
  parseCatalogId,
  parseValue,
  positiveCatalogIdSchema,
  uuidSchema,
} from "../lib/validation.ts"
import {
  destinationCountExpression,
  estimatedCostExpression,
  publicTripProjection,
} from "../services/trip-read.ts"

const publicTripsQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cityId: positiveCatalogIdSchema.optional(),
  })
  .strict()

const publicTripCursorSchema = z
  .object({
    v: z.literal(1),
    createdAt: z.iso.datetime(),
    id: uuidSchema,
  })
  .strict()

export function createPublicTripRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .get("/", async (context) => {
      const query = parseValue(publicTripsQuerySchema, context.req.query())
      const cityId = query.cityId ? parseCatalogId(query.cityId, "cityId") : undefined
      const cursor = decodeCursor(query.cursor, publicTripCursorSchema)

      const rows = await dependencies.database
        .select({
          trip: trips,
          owner: { id: user.id, name: user.name, image: user.image },
          destinationCount: destinationCountExpression,
          estimatedCost: estimatedCostExpression,
        })
        .from(trips)
        .innerJoin(user, eq(user.id, trips.ownerId))
        .where(
          and(
            eq(trips.visibility, "public"),
            cityId !== undefined
              ? sql`exists (
                select 1 from "trip_stops" feed_stops
                where feed_stops."trip_id" = "trips"."id"
                  and feed_stops."city_id" = ${cityId}
              )`
              : undefined,
            cursor
              ? or(
                  lt(trips.createdAt, new Date(cursor.createdAt)),
                  and(eq(trips.createdAt, new Date(cursor.createdAt)), lt(trips.id, cursor.id)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(trips.createdAt), desc(trips.id))
        .limit(query.limit + 1)

      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      const nextCursor =
        rows.length > query.limit && last
          ? encodeCursor({ createdAt: last.trip.createdAt.toISOString(), id: last.trip.id })
          : null

      return context.json({
        data: page.map(({ destinationCount, estimatedCost, owner, trip }) => ({
          id: trip.id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          destinationCount,
          estimatedCost,
          baseCurrency: trip.baseCurrency,
          coverImageUrl: null,
          owner: { id: owner.id, name: owner.name, imageUrl: owner.image },
        })),
        meta: { nextCursor },
      })
    })

    .get("/:tripId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const data = await publicTripProjection(dependencies.database, tripId)
      setTripEtag(context, data.version)
      return context.json({ data })
    })
}
