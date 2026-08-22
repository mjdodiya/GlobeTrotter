import { tripMembers, user } from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { and, asc, eq, sql } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"
import { requireExpectedVersion, setTripEtag, timestamp } from "../lib/http.ts"
import { parseJson, parseValue, uuidSchema } from "../lib/validation.ts"
import { executeTripMutation, loadTripParticipantAccess } from "../services/trip-access.ts"

const memberRoleSchema = z.enum(["viewer", "editor"])

const addMemberSchema = z
  .object({
    email: z.email().max(320),
    role: memberRoleSchema,
  })
  .strict()

const changeMemberRoleSchema = z.object({ role: memberRoleSchema }).strict()

function memberUserId(value: string): string {
  return parseValue(z.string().min(1).max(500), value)
}

export function createMemberRoutes(dependencies: ApiDependencies) {
  const routes = new Hono<ApiEnvironment>()

  routes.get("/:tripId/members", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const access = await loadTripParticipantAccess(
      dependencies.database,
      tripId,
      context.var.session.user.id,
    )

    const rows = await dependencies.database
      .select({
        member: tripMembers,
        user: { id: user.id, name: user.name, image: user.image },
      })
      .from(tripMembers)
      .innerJoin(user, eq(user.id, tripMembers.userId))
      .where(eq(tripMembers.tripId, tripId))
      .orderBy(asc(tripMembers.createdAt), asc(tripMembers.userId))

    setTripEtag(context, access.trip.version)
    return context.json({
      data: rows.map((row) => ({
        user: {
          id: row.user.id,
          name: row.user.name,
          imageUrl: row.user.image,
        },
        role: row.member.role,
        createdAt: timestamp(row.member.createdAt),
      })),
    })
  })

  routes.post("/:tripId/members", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const expectedVersion = requireExpectedVersion(context)
    const input = await parseJson(context, addMemberSchema)

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "ownership",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ access, transaction }) => {
        const [memberUser] = await transaction
          .select({
            id: user.id,
            name: user.name,
            image: user.image,
            emailVerified: user.emailVerified,
          })
          .from(user)
          .where(sql`lower(${user.email}) = lower(${input.email})`)
          .limit(1)
        if (!memberUser) {
          throw new DomainError("USER_NOT_FOUND", "No user exists for that email address.")
        }
        if (context.var.session.user.emailVerified === false || !memberUser.emailVerified) {
          throw new DomainError(
            "FORBIDDEN",
            "Both accounts must verify their email before direct collaboration.",
          )
        }
        if (memberUser.id === access.trip.ownerId) {
          throw new DomainError(
            "OWNER_CANNOT_BE_MEMBER",
            "The trip owner cannot also be an explicit member.",
          )
        }

        const [existing] = await transaction
          .select({ userId: tripMembers.userId })
          .from(tripMembers)
          .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, memberUser.id)))
          .limit(1)
        if (existing) {
          throw new DomainError("TRIP_MEMBER_ALREADY_EXISTS", "The user is already a trip member.")
        }

        const [member] = await transaction
          .insert(tripMembers)
          .values({ tripId, userId: memberUser.id, role: input.role })
          .returning()
        if (!member) throw new Error("Member insert did not return a row")
        return { member, memberUser }
      },
    )

    setTripEtag(context, result.version)
    return context.json(
      {
        data: {
          user: {
            id: result.data.memberUser.id,
            name: result.data.memberUser.name,
            imageUrl: result.data.memberUser.image,
          },
          role: result.data.member.role,
          createdAt: timestamp(result.data.member.createdAt),
          version: result.version,
        },
      },
      201,
    )
  })

  routes.delete("/:tripId/members/me", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const userId = context.var.session.user.id
    const access = await loadTripParticipantAccess(dependencies.database, tripId, userId)
    if (access.level === "owner") {
      throw new DomainError("FORBIDDEN", "A Trip Owner cannot leave their own Trip.")
    }
    await dependencies.database
      .delete(tripMembers)
      .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)))
    return context.body(null, 204)
  })

  routes.patch("/:tripId/members/:userId", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const targetUserId = memberUserId(context.req.param("userId"))
    const expectedVersion = requireExpectedVersion(context)
    const input = await parseJson(context, changeMemberRoleSchema)

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "ownership",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ access, transaction }) => {
        if (targetUserId === access.trip.ownerId) {
          throw new DomainError(
            "OWNER_CANNOT_BE_MEMBER",
            "The owner cannot be managed through membership endpoints.",
          )
        }

        const [updated] = await transaction
          .update(tripMembers)
          .set({ role: input.role })
          .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetUserId)))
          .returning()
        if (!updated) {
          throw new DomainError("TRIP_MEMBER_NOT_FOUND", "The user is not a member of this trip.")
        }

        const [member] = await transaction
          .select({ id: user.id, name: user.name, image: user.image })
          .from(user)
          .where(eq(user.id, targetUserId))
          .limit(1)
        if (!member) {
          throw new DomainError("TRIP_MEMBER_NOT_FOUND", "The trip member no longer exists.")
        }

        return { member, role: updated.role }
      },
    )

    setTripEtag(context, result.version)
    return context.json({
      data: {
        user: {
          id: result.data.member.id,
          name: result.data.member.name,
          imageUrl: result.data.member.image,
        },
        role: result.data.role,
        version: result.version,
      },
    })
  })

  routes.delete("/:tripId/members/:userId", async (context) => {
    const tripId = parseValue(uuidSchema, context.req.param("tripId"))
    const targetUserId = memberUserId(context.req.param("userId"))
    const expectedVersion = requireExpectedVersion(context)

    const result = await executeTripMutation(
      {
        database: dependencies.database,
        expectedVersion,
        requirement: "ownership",
        tripId,
        userId: context.var.session.user.id,
      },
      async ({ access, transaction }) => {
        if (targetUserId === access.trip.ownerId) {
          throw new DomainError(
            "OWNER_CANNOT_BE_MEMBER",
            "The owner cannot be managed through membership endpoints.",
          )
        }

        const [deleted] = await transaction
          .delete(tripMembers)
          .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetUserId)))
          .returning({ userId: tripMembers.userId })
        if (!deleted) {
          throw new DomainError("TRIP_MEMBER_NOT_FOUND", "The user is not a member of this trip.")
        }
      },
    )

    setTripEtag(context, result.version)
    return context.body(null, 204)
  })

  return routes
}
