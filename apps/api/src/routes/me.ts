import { cities, countries, savedCities, user, userTravelPreferences } from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { and, desc, eq, lt, or } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { bigintId, decodeCursor, encodeCursor, timestamp } from "../lib/http.ts"
import {
  currencySchema,
  parseCatalogId,
  parseJson,
  parseValue,
  positiveCatalogIdSchema,
  requireNonEmptyPatch,
} from "../lib/validation.ts"
import { requireSession } from "../middleware/authentication.ts"
import {
  buildAccountCalendar,
  buildAccountExport,
  getAccountDeletionImpact,
} from "../services/account-export.ts"

const updateProfileSchema = z
  .object({
    defaultCurrency: currencySchema.optional(),
    locale: z
      .string()
      .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
      .optional(),
    name: z.string().trim().min(1).max(500).optional(),
    imageKey: z.string().min(1).max(2_000).nullable().optional(),
  })
  .strict()

const savedCitiesQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

const savedCityCursorSchema = z
  .object({
    v: z.literal(1),
    createdAt: z.iso.datetime(),
    cityId: positiveCatalogIdSchema,
  })
  .strict()

export function createMeRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .use("*", requireSession(dependencies))
    .get("/", async (context) => {
      const [currentUser] = await dependencies.database
        .select({
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          image: user.image,
          locale: userTravelPreferences.locale,
          defaultCurrency: userTravelPreferences.defaultCurrency,
        })
        .from(user)
        .leftJoin(userTravelPreferences, eq(userTravelPreferences.userId, user.id))
        .where(eq(user.id, context.var.session.user.id))
        .limit(1)

      if (!currentUser) {
        throw new DomainError("UNAUTHENTICATED", "The authenticated account no longer exists.")
      }

      return context.json({
        data: {
          id: currentUser.id,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          name: currentUser.name,
          imageUrl: currentUser.image,
          locale: currentUser.locale ?? "en",
          defaultCurrency: currentUser.defaultCurrency ?? "USD",
        },
      })
    })

    .patch("/", async (context) => {
      const input = await parseJson(context, updateProfileSchema)
      requireNonEmptyPatch(input)
      const userId = context.var.session.user.id

      if (input.imageKey) {
        const expectedPrefix = `users/${userId}/avatars/`
        if (!input.imageKey.startsWith(expectedPrefix)) {
          throw new DomainError(
            "FORBIDDEN",
            "The profile image key does not belong to the authenticated user.",
          )
        }
      }

      const updated = await dependencies.database.transaction(async (transaction) => {
        const [profile] = await transaction
          .update(user)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.imageKey !== undefined ? { image: input.imageKey } : {}),
            updatedAt: new Date(),
          })
          .where(eq(user.id, userId))
          .returning({
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            name: user.name,
            image: user.image,
          })

        if (input.locale !== undefined || input.defaultCurrency !== undefined) {
          await transaction
            .insert(userTravelPreferences)
            .values({
              userId,
              locale: input.locale ?? "en",
              defaultCurrency: input.defaultCurrency ?? "USD",
            })
            .onConflictDoUpdate({
              target: userTravelPreferences.userId,
              set: {
                ...(input.locale !== undefined ? { locale: input.locale } : {}),
                ...(input.defaultCurrency !== undefined
                  ? { defaultCurrency: input.defaultCurrency }
                  : {}),
                updatedAt: new Date(),
              },
            })
        }
        const [preferences] = await transaction
          .select({
            locale: userTravelPreferences.locale,
            defaultCurrency: userTravelPreferences.defaultCurrency,
          })
          .from(userTravelPreferences)
          .where(eq(userTravelPreferences.userId, userId))
          .limit(1)
        return profile ? { ...profile, ...preferences } : undefined
      })

      if (!updated) {
        throw new DomainError("UNAUTHENTICATED", "The authenticated account no longer exists.")
      }

      return context.json({
        data: {
          id: updated.id,
          email: updated.email,
          emailVerified: updated.emailVerified,
          name: updated.name,
          imageUrl: updated.image,
          locale: updated.locale ?? "en",
          defaultCurrency: updated.defaultCurrency ?? "USD",
        },
      })
    })

    .get("/deletion-impact", async (context) => {
      const data = await getAccountDeletionImpact(
        dependencies.database,
        context.var.session.user.id,
      )
      return context.json({ data })
    })

    .get("/export", async (context) => {
      const data = await buildAccountExport(
        dependencies.database,
        context.var.session.user.id,
        new Date(),
      )
      context.header("Content-Disposition", 'attachment; filename="globetrotter-export.json"')
      return context.json({ data })
    })

    .get("/calendar.ics", async (context) => {
      const calendar = await buildAccountCalendar(
        dependencies.database,
        context.var.session.user.id,
        new Date(),
      )
      context.header("Content-Disposition", 'attachment; filename="globetrotter-calendar.ics"')
      context.header("Content-Type", "text/calendar; charset=utf-8")
      return context.body(calendar)
    })

    .get("/saved-cities", async (context) => {
      const query = parseValue(savedCitiesQuerySchema, context.req.query())
      const cursor = decodeCursor(query.cursor, savedCityCursorSchema)
      const cursorCityId = cursor ? parseCatalogId(cursor.cityId, "cursor") : undefined

      const rows = await dependencies.database
        .select({
          savedAt: savedCities.createdAt,
          city: cities,
          country: { code: countries.code, name: countries.name },
        })
        .from(savedCities)
        .innerJoin(cities, eq(cities.id, savedCities.cityId))
        .innerJoin(countries, eq(countries.code, cities.countryCode))
        .where(
          and(
            eq(savedCities.userId, context.var.session.user.id),
            cursor && cursorCityId !== undefined
              ? or(
                  lt(savedCities.createdAt, new Date(cursor.createdAt)),
                  and(
                    eq(savedCities.createdAt, new Date(cursor.createdAt)),
                    lt(savedCities.cityId, cursorCityId),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(desc(savedCities.createdAt), desc(savedCities.cityId))
        .limit(query.limit + 1)

      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      const nextCursor =
        rows.length > query.limit && last
          ? encodeCursor({
              createdAt: last.savedAt.toISOString(),
              cityId: String(last.city.id),
            })
          : null

      return context.json({
        data: page.map(({ city, country, savedAt }) => ({
          id: bigintId(city.id),
          name: city.name,
          region: city.region,
          timezone: city.timezone,
          country,
          costIndex: city.costIndex,
          imageUrl: city.imageUrl,
          savedAt: timestamp(savedAt),
        })),
        meta: { nextCursor },
      })
    })

    .put("/saved-cities/:cityId", async (context) => {
      const cityId = parseCatalogId(context.req.param("cityId"), "cityId")
      const [city] = await dependencies.database
        .select({ id: cities.id, name: cities.name })
        .from(cities)
        .where(eq(cities.id, cityId))
        .limit(1)
      if (!city) {
        throw new DomainError("CATALOG_CITY_NOT_FOUND", "The catalog city does not exist.")
      }

      await dependencies.database
        .insert(savedCities)
        .values({ userId: context.var.session.user.id, cityId })
        .onConflictDoNothing()

      return context.json({ data: { cityId: bigintId(city.id), saved: true } })
    })

    .delete("/saved-cities/:cityId", async (context) => {
      const cityId = parseCatalogId(context.req.param("cityId"), "cityId")
      await dependencies.database
        .delete(savedCities)
        .where(
          and(eq(savedCities.userId, context.var.session.user.id), eq(savedCities.cityId, cityId)),
        )
      return context.body(null, 204)
    })
}
