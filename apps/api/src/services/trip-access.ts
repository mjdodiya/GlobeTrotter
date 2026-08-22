import {
  type Database,
  type DatabaseTransaction,
  itineraryItems,
  tripMembers,
  trips,
  tripStops,
} from "@globetrotter/db"
import { DomainError } from "@globetrotter/domain"
import { and, eq, sql } from "drizzle-orm"

export type DatabaseExecutor = Database | DatabaseTransaction
export type TripParticipantAccessLevel = "owner" | "editor" | "viewer"
export type TripRow = typeof trips.$inferSelect

export type TripParticipantAccess = {
  level: TripParticipantAccessLevel
  trip: TripRow
}

type LockMode = "share" | "update"
type ReadAccess = TripParticipantAccess | { level: "public"; trip: TripRow }

type TripMutationOptions = {
  database: Database
  expectedVersion: number
  requirement: "editing" | "ownership"
  tripId: string
  userId: string
}

type TripMutationContext = {
  access: TripParticipantAccess
  transaction: DatabaseTransaction
  version: number
}

async function loadReadableTripAccess(
  database: DatabaseExecutor,
  tripId: string,
  userId: string,
  lock?: LockMode,
): Promise<ReadAccess> {
  const query = database
    .select({ memberRole: tripMembers.role, trip: trips })
    .from(trips)
    .leftJoin(tripMembers, and(eq(tripMembers.tripId, trips.id), eq(tripMembers.userId, userId)))
    .where(eq(trips.id, tripId))
    .limit(1)

  const [result] = lock ? await query.for(lock, { of: trips }) : await query

  if (!result) {
    throw new DomainError("TRIP_NOT_FOUND", "The trip does not exist or is not accessible.")
  }

  const level: TripParticipantAccessLevel | "public" | undefined =
    result.trip.ownerId === userId
      ? "owner"
      : result.memberRole
        ? result.memberRole
        : result.trip.visibility === "public"
          ? "public"
          : undefined

  if (!level) {
    throw new DomainError("TRIP_NOT_FOUND", "The trip does not exist or is not accessible.")
  }

  return { level, trip: result.trip }
}

export async function loadTripParticipantAccess(
  database: DatabaseExecutor,
  tripId: string,
  userId: string,
  lock?: LockMode,
): Promise<TripParticipantAccess> {
  const access = await loadReadableTripAccess(database, tripId, userId, lock)
  if (access.level === "public") {
    throw new DomainError("TRIP_NOT_FOUND", "The trip does not exist or is not accessible.")
  }
  return access
}

export async function loadCopyableTrip(
  database: DatabaseExecutor,
  tripId: string,
  userId: string,
  lock?: LockMode,
): Promise<TripRow> {
  return (await loadReadableTripAccess(database, tripId, userId, lock)).trip
}

export async function executeTripMutation<T>(
  options: TripMutationOptions,
  operation: (context: TripMutationContext) => Promise<T>,
): Promise<{ data: T; version: number }> {
  // Authorization, optimistic-concurrency validation, version increment, and
  // domain writes share one transaction and one locked Trip aggregate.
  return options.database.transaction(async (transaction) => {
    const access = await loadTripParticipantAccess(
      transaction,
      options.tripId,
      options.userId,
      "update",
    )

    if (options.requirement === "ownership") requireTripOwner(access)
    else requireTripEditingAccess(access)
    requireCurrentVersion(access, options.expectedVersion)

    const version = await bumpTripVersion(transaction, options.tripId, options.expectedVersion)
    const data = await operation({ access, transaction, version })
    return { data, version }
  })
}

export function requireTripEditingAccess(access: TripParticipantAccess): void {
  if (access.level !== "owner" && access.level !== "editor") {
    throw new DomainError("FORBIDDEN", "Editor access is required for this operation.")
  }
}

export function requireTripOwner(access: TripParticipantAccess): void {
  if (access.level !== "owner") {
    throw new DomainError("FORBIDDEN", "Only the trip owner may perform this operation.")
  }
}

export function requireCurrentVersion(
  access: TripParticipantAccess,
  expectedVersion: number,
): void {
  if (access.trip.version !== expectedVersion) {
    throw new DomainError(
      "STALE_TRIP_VERSION",
      `The trip has changed. Its current version is ${access.trip.version}.`,
    )
  }
}

export async function bumpTripVersion(
  transaction: DatabaseTransaction,
  tripId: string,
  expectedVersion: number,
): Promise<number> {
  const [updated] = await transaction
    .update(trips)
    .set({
      updatedAt: new Date(),
      version: sql`${trips.version} + 1`,
    })
    .where(and(eq(trips.id, tripId), eq(trips.version, expectedVersion)))
    .returning({ version: trips.version })

  if (!updated) {
    throw new DomainError("STALE_TRIP_VERSION", "The trip changed before the mutation completed.")
  }

  return updated.version
}

export async function loadTripStop(database: DatabaseExecutor, tripId: string, stopId: string) {
  const [stop] = await database
    .select()
    .from(tripStops)
    .where(and(eq(tripStops.id, stopId), eq(tripStops.tripId, tripId)))
    .limit(1)

  if (!stop) {
    throw new DomainError("STOP_NOT_FOUND", "The stop does not belong to this trip.")
  }

  return stop
}

export async function loadItineraryItem(
  database: DatabaseExecutor,
  stopId: string,
  itemId: string,
) {
  const [item] = await database
    .select()
    .from(itineraryItems)
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripStopId, stopId)))
    .limit(1)

  if (!item) {
    throw new DomainError(
      "ITINERARY_ITEM_NOT_FOUND",
      "The itinerary item does not belong to this stop.",
    )
  }

  return item
}

export function tripCapabilities(level: TripParticipantAccessLevel) {
  const isOwner = level === "owner"
  const canEdit = isOwner || level === "editor"

  return {
    level,
    canEdit,
    canManageMembers: isOwner,
    canManageShareLinks: isOwner,
    canDelete: isOwner,
  }
}
