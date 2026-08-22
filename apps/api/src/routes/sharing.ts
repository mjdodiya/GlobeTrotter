import { createHash, randomBytes } from "node:crypto"

import { type Database, type DatabaseTransaction, tripShareLinks, trips } from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { and, asc, eq, gt, isNull, or } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { requireExpectedVersion, setTripEtag, timestamp } from "../lib/http.ts"
import { dateSchema, parseJson, parseValue, uuidSchema } from "../lib/validation.ts"
import { requireSession } from "../middleware/authentication.ts"
import {
  executeTripMutation,
  loadTripParticipantAccess,
  requireTripOwner,
} from "../services/trip-access.ts"
import { copyTripAggregate } from "../services/trip-copy.ts"
import { linkSharedTripProjection } from "../services/trip-read.ts"

const createShareLinkSchema = z
  .object({
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()

const copyLinkSharedTripSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    startDate: dateSchema.optional(),
  })
  .strict()

const shareTokenSchema = z
  .string()
  .min(32)
  .max(500)
  .regex(/^[A-Za-z0-9_-]+$/)

function shareToken(value: string): string {
  const result = shareTokenSchema.safeParse(value)
  if (!result.success) {
    throw new DomainError("TRIP_NOT_FOUND", "The link-shared trip is not available.")
  }
  return result.data
}

function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

async function loadLinkSharedTrip(
  database: Database | DatabaseTransaction,
  token: string,
  lock = false,
) {
  const tokenHash = hashShareToken(token)
  const query = database
    .select({ trip: trips })
    .from(tripShareLinks)
    .innerJoin(trips, eq(trips.id, tripShareLinks.tripId))
    .where(
      and(
        eq(tripShareLinks.tokenHash, tokenHash),
        isNull(tripShareLinks.revokedAt),
        or(isNull(tripShareLinks.expiresAt), gt(tripShareLinks.expiresAt, new Date())),
      ),
    )
    .limit(1)

  const [result] = lock ? await query.for("share", { of: trips }) : await query
  if (!result) {
    throw new DomainError("TRIP_NOT_FOUND", "The link-shared trip is not available.")
  }
  return result.trip
}

export function createShareLinkRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .get("/:tripId/share-links", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const access = await loadTripParticipantAccess(
        dependencies.database,
        tripId,
        context.var.session.user.id,
      )
      requireTripOwner(access)

      const links = await dependencies.database
        .select({
          id: tripShareLinks.id,
          createdAt: tripShareLinks.createdAt,
          expiresAt: tripShareLinks.expiresAt,
          revokedAt: tripShareLinks.revokedAt,
        })
        .from(tripShareLinks)
        .where(eq(tripShareLinks.tripId, tripId))
        .orderBy(asc(tripShareLinks.createdAt), asc(tripShareLinks.id))

      setTripEtag(context, access.trip.version)
      return context.json({
        data: links.map((link) => ({
          id: link.id,
          createdAt: timestamp(link.createdAt),
          expiresAt: timestamp(link.expiresAt),
          revokedAt: timestamp(link.revokedAt),
        })),
      })
    })

    .post("/:tripId/share-links", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const expectedVersion = requireExpectedVersion(context)
      const input = await parseJson(context, createShareLinkSchema)
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
      if (expiresAt && expiresAt <= new Date()) {
        throw new DomainError("VALIDATION_ERROR", "expiresAt must be in the future.", {
          errors: { expiresAt: ["Must be in the future."] },
        })
      }

      const token = randomBytes(32).toString("base64url")
      const tokenHash = hashShareToken(token)
      const result = await executeTripMutation(
        {
          database: dependencies.database,
          expectedVersion,
          requirement: "ownership",
          tripId,
          userId: context.var.session.user.id,
        },
        async ({ transaction }) => {
          const [link] = await transaction
            .insert(tripShareLinks)
            .values({
              tripId,
              createdBy: context.var.session.user.id,
              tokenHash,
              expiresAt,
            })
            .returning({
              id: tripShareLinks.id,
              expiresAt: tripShareLinks.expiresAt,
            })
          if (!link) throw new Error("Share link insert did not return a row")
          return link
        },
      )

      const url = new URL(`/share/${token}`, dependencies.webOrigin).toString()
      setTripEtag(context, result.version)
      context.header("Cache-Control", "no-store")
      return context.json(
        {
          data: {
            id: result.data.id,
            url,
            expiresAt: timestamp(result.data.expiresAt),
            version: result.version,
          },
        },
        201,
      )
    })

    .delete("/:tripId/share-links/:shareLinkId", async (context) => {
      const tripId = parseValue(uuidSchema, context.req.param("tripId"))
      const shareLinkId = parseValue(uuidSchema, context.req.param("shareLinkId"))
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
          const [link] = await transaction
            .select({ id: tripShareLinks.id, revokedAt: tripShareLinks.revokedAt })
            .from(tripShareLinks)
            .where(and(eq(tripShareLinks.id, shareLinkId), eq(tripShareLinks.tripId, tripId)))
            .limit(1)
          if (!link) {
            throw new DomainError("SHARE_LINK_NOT_FOUND", "The share link was not found.")
          }

          if (!link.revokedAt) {
            await transaction
              .update(tripShareLinks)
              .set({ revokedAt: new Date() })
              .where(and(eq(tripShareLinks.id, shareLinkId), eq(tripShareLinks.tripId, tripId)))
          }
        },
      )

      setTripEtag(context, result.version)
      return context.body(null, 204)
    })
}

export function createLinkSharedTripRoutes(dependencies: ApiDependencies) {
  return new Hono<ApiEnvironment>()
    .get("/:token", async (context) => {
      const token = shareToken(context.req.param("token"))
      const result = await dependencies.database.transaction(async (transaction) => {
        const trip = await loadLinkSharedTrip(transaction, token, true)
        const data = await linkSharedTripProjection(transaction, trip.id)
        return { data, version: trip.version }
      })
      setTripEtag(context, result.version)
      context.header("Cache-Control", "no-store")
      return context.json({ data: result.data })
    })

    .post("/:token/copy", requireSession(dependencies), async (context) => {
      const token = shareToken(context.req.param("token"))
      const input = await parseJson(context, copyLinkSharedTripSchema)

      const copiedTrip = await dependencies.database.transaction(async (transaction) => {
        const source = await loadLinkSharedTrip(transaction, token, true)
        return copyTripAggregate(transaction, source, context.var.session.user.id, input)
      })

      setTripEtag(context, copiedTrip.version)
      context.header("Location", `/api/v1/trips/${copiedTrip.id}`)
      context.header("Cache-Control", "no-store")
      return context.json({ data: { id: copiedTrip.id, version: copiedTrip.version } }, 201)
    })
}
