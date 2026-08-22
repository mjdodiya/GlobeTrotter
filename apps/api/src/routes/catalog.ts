import { activities, activityCategories, cities, countries } from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { and, asc, eq, gt, ilike, lte, or, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { bigintId, decodeCursor, encodeCursor, timestamp } from "../lib/http.ts"
import {
  currencySchema,
  moneySchema,
  parseCatalogId,
  parseValue,
  positiveCatalogIdSchema,
} from "../lib/validation.ts"

const citySearchSchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    region: z.string().trim().min(1).max(200).optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const activitySearchSchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    cityId: positiveCatalogIdSchema.optional(),
    categoryId: positiveCatalogIdSchema.optional(),
    maxDurationMinutes: z.coerce.number().int().positive().optional(),
    currency: currencySchema.optional(),
    maxCost: moneySchema.optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const namedCatalogCursorSchema = z
  .object({
    v: z.literal(1),
    name: z.string(),
    id: positiveCatalogIdSchema,
  })
  .strict()

function literalSearchPattern(value: string): string {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`
}

function serializeCity(city: typeof cities.$inferSelect, country: { code: string; name: string }) {
  return {
    id: bigintId(city.id),
    name: city.name,
    country,
    region: city.region,
    timezone: city.timezone,
    latitude: city.latitude,
    longitude: city.longitude,
    costIndex: city.costIndex,
    description: city.description,
    imageUrl: city.imageUrl,
  }
}

function serializeActivity(
  activity: typeof activities.$inferSelect,
  city: { id: number; name: string },
  category: { id: number; name: string },
) {
  return {
    id: bigintId(activity.id),
    city: { id: bigintId(city.id), name: city.name },
    category: { id: bigintId(category.id), name: category.name },
    name: activity.name,
    description: activity.description,
    defaultDurationMinutes: activity.defaultDurationMinutes,
    estimatedCost: activity.estimatedCost,
    currency: activity.currency,
    imageUrl: activity.imageUrl,
    createdAt: timestamp(activity.createdAt),
    updatedAt: timestamp(activity.updatedAt),
  }
}

export function createCatalogRoutes(dependencies: ApiDependencies) {
  const routes = new Hono<ApiEnvironment>()

  routes.get("/countries", async (context) => {
    const rows = await dependencies.database
      .select({ code: countries.code, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name), asc(countries.code))
    context.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
    return context.json({ data: rows })
  })

  routes.get("/cities", async (context) => {
    const query = parseValue(citySearchSchema, context.req.query())
    const cursor = decodeCursor(query.cursor, namedCatalogCursorSchema)
    const cursorId = cursor ? parseCatalogId(cursor.id, "cursor") : undefined

    const rows = await dependencies.database
      .select({ city: cities, country: { code: countries.code, name: countries.name } })
      .from(cities)
      .innerJoin(countries, eq(countries.code, cities.countryCode))
      .where(
        and(
          query.q
            ? sql`${cities.name} ilike ${literalSearchPattern(query.q)} escape '\\'`
            : undefined,
          query.countryCode ? eq(cities.countryCode, query.countryCode) : undefined,
          query.region ? ilike(cities.region, query.region) : undefined,
          cursor && cursorId !== undefined
            ? or(
                gt(cities.name, cursor.name),
                and(eq(cities.name, cursor.name), gt(cities.id, cursorId)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(cities.name), asc(cities.id))
      .limit(query.limit + 1)

    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    const nextCursor =
      rows.length > query.limit && last
        ? encodeCursor({ name: last.city.name, id: String(last.city.id) })
        : null

    return context.json({
      data: page.map(({ city, country }) => serializeCity(city, country)),
      meta: { nextCursor },
    })
  })

  routes.get("/cities/:cityId", async (context) => {
    const cityId = parseCatalogId(context.req.param("cityId"), "cityId")
    const [row] = await dependencies.database
      .select({ city: cities, country: { code: countries.code, name: countries.name } })
      .from(cities)
      .innerJoin(countries, eq(countries.code, cities.countryCode))
      .where(eq(cities.id, cityId))
      .limit(1)
    if (!row) throw new DomainError("CATALOG_CITY_NOT_FOUND", "The catalog city does not exist.")
    return context.json({ data: serializeCity(row.city, row.country) })
  })

  routes.get("/activity-categories", async (context) => {
    const rows = await dependencies.database
      .select()
      .from(activityCategories)
      .orderBy(asc(activityCategories.name), asc(activityCategories.id))
    context.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
    return context.json({
      data: rows.map((category) => ({ id: bigintId(category.id), name: category.name })),
    })
  })

  routes.get("/activities", async (context) => {
    const query = parseValue(activitySearchSchema, context.req.query())
    if (query.maxCost !== undefined && query.currency === undefined) {
      throw new DomainError("VALIDATION_ERROR", "currency is required when maxCost is supplied.", {
        errors: { currency: ["Required when maxCost is supplied."] },
      })
    }

    const cityId = query.cityId ? parseCatalogId(query.cityId, "cityId") : undefined
    const categoryId = query.categoryId ? parseCatalogId(query.categoryId, "categoryId") : undefined
    const cursor = decodeCursor(query.cursor, namedCatalogCursorSchema)
    const cursorId = cursor ? parseCatalogId(cursor.id, "cursor") : undefined

    const rows = await dependencies.database
      .select({
        activity: activities,
        city: { id: cities.id, name: cities.name },
        category: { id: activityCategories.id, name: activityCategories.name },
      })
      .from(activities)
      .innerJoin(cities, eq(cities.id, activities.cityId))
      .innerJoin(activityCategories, eq(activityCategories.id, activities.categoryId))
      .where(
        and(
          query.q
            ? sql`${activities.name} ilike ${literalSearchPattern(query.q)} escape '\\'`
            : undefined,
          cityId !== undefined ? eq(activities.cityId, cityId) : undefined,
          categoryId !== undefined ? eq(activities.categoryId, categoryId) : undefined,
          query.maxDurationMinutes !== undefined
            ? lte(activities.defaultDurationMinutes, query.maxDurationMinutes)
            : undefined,
          query.currency ? eq(activities.currency, query.currency) : undefined,
          query.maxCost ? lte(activities.estimatedCost, query.maxCost) : undefined,
          cursor && cursorId !== undefined
            ? or(
                gt(activities.name, cursor.name),
                and(eq(activities.name, cursor.name), gt(activities.id, cursorId)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(activities.name), asc(activities.id))
      .limit(query.limit + 1)

    const page = rows.slice(0, query.limit)
    const last = page.at(-1)
    const nextCursor =
      rows.length > query.limit && last
        ? encodeCursor({ name: last.activity.name, id: String(last.activity.id) })
        : null

    return context.json({
      data: page.map(({ activity, category, city }) => serializeActivity(activity, city, category)),
      meta: { nextCursor },
    })
  })

  routes.get("/activities/:activityId", async (context) => {
    const activityId = parseCatalogId(context.req.param("activityId"), "activityId")
    const [row] = await dependencies.database
      .select({
        activity: activities,
        city: { id: cities.id, name: cities.name },
        category: { id: activityCategories.id, name: activityCategories.name },
      })
      .from(activities)
      .innerJoin(cities, eq(cities.id, activities.cityId))
      .innerJoin(activityCategories, eq(activityCategories.id, activities.categoryId))
      .where(eq(activities.id, activityId))
      .limit(1)

    if (!row) {
      throw new DomainError("CATALOG_ACTIVITY_NOT_FOUND", "The catalog activity does not exist.")
    }
    return context.json({ data: serializeActivity(row.activity, row.city, row.category) })
  })

  return routes
}
