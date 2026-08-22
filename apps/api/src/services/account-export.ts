import {
  cities,
  countries,
  itineraryItems,
  savedCities,
  tripLegs,
  tripMembers,
  tripShareLinks,
  tripStops,
  trips,
  user,
  userTravelPreferences,
  type Database,
} from "@globetrotter/db"
import { asc, count, countDistinct, eq, or, sql } from "drizzle-orm"

import { addDays } from "../lib/validation.ts"
import { tripPlanningProjection } from "./trip-read.ts"

function accessibleTripCondition(userId: string) {
  return or(
    eq(trips.ownerId, userId),
    sql<boolean>`exists (
      select 1 from ${tripMembers}
      where ${tripMembers.tripId} = ${trips.id}
        and ${tripMembers.userId} = ${userId}
    )`,
  )
}

export async function getAccountDeletionImpact(database: Database, userId: string) {
  const [owned] = await database
    .select({
      collaborators: countDistinct(tripMembers.userId),
      itineraryItems: countDistinct(itineraryItems.id),
      ownedTrips: countDistinct(trips.id),
      travelLegs: countDistinct(tripLegs.id),
      tripStops: countDistinct(tripStops.id),
    })
    .from(trips)
    .leftJoin(tripMembers, eq(tripMembers.tripId, trips.id))
    .leftJoin(tripStops, eq(tripStops.tripId, trips.id))
    .leftJoin(itineraryItems, eq(itineraryItems.tripStopId, tripStops.id))
    .leftJoin(tripLegs, eq(tripLegs.tripId, trips.id))
    .where(eq(trips.ownerId, userId))

  const [memberships] = await database
    .select({ count: count() })
    .from(tripMembers)
    .where(eq(tripMembers.userId, userId))
  const [links] = await database
    .select({ count: count() })
    .from(tripShareLinks)
    .where(eq(tripShareLinks.createdBy, userId))
  const [saved] = await database
    .select({ count: count() })
    .from(savedCities)
    .where(eq(savedCities.userId, userId))

  return {
    ownedTrips: owned?.ownedTrips ?? 0,
    tripStops: owned?.tripStops ?? 0,
    itineraryItems: owned?.itineraryItems ?? 0,
    travelLegs: owned?.travelLegs ?? 0,
    collaboratorsLosingAccess: owned?.collaborators ?? 0,
    membershipsRemoved: memberships?.count ?? 0,
    shareLinksRevoked: links?.count ?? 0,
    savedCitiesRemoved: saved?.count ?? 0,
  }
}

export async function buildAccountExport(database: Database, userId: string, exportedAt: Date) {
  return database.transaction(async (transaction) => {
    const [profile] = await transaction
      .select({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        imageUrl: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        locale: userTravelPreferences.locale,
        defaultCurrency: userTravelPreferences.defaultCurrency,
      })
      .from(user)
      .leftJoin(userTravelPreferences, eq(userTravelPreferences.userId, user.id))
      .where(eq(user.id, userId))
      .limit(1)

    const saved = await transaction
      .select({
        city: cities,
        country: { code: countries.code, name: countries.name },
        savedAt: savedCities.createdAt,
      })
      .from(savedCities)
      .innerJoin(cities, eq(cities.id, savedCities.cityId))
      .innerJoin(countries, eq(countries.code, cities.countryCode))
      .where(eq(savedCities.userId, userId))
      .orderBy(asc(savedCities.createdAt), asc(savedCities.cityId))

    const ownedRows = await transaction
      .select()
      .from(trips)
      .where(eq(trips.ownerId, userId))
      .orderBy(asc(trips.createdAt), asc(trips.id))

    const memberships = await transaction
      .select({
        createdAt: tripMembers.createdAt,
        role: tripMembers.role,
        trip: {
          id: trips.id,
          name: trips.name,
          ownerId: trips.ownerId,
          startDate: trips.startDate,
          endDate: trips.endDate,
        },
      })
      .from(tripMembers)
      .innerJoin(trips, eq(trips.id, tripMembers.tripId))
      .where(eq(tripMembers.userId, userId))
      .orderBy(asc(tripMembers.createdAt), asc(tripMembers.tripId))

    const ownedTrips = []
    for (const trip of ownedRows) {
      // A Drizzle transaction owns one pg client; its queries must remain sequential.
      // oxlint-disable-next-line no-await-in-loop
      ownedTrips.push({ ...trip, planning: await tripPlanningProjection(transaction, trip) })
    }

    return {
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      profile: profile
        ? {
            ...profile,
            locale: profile.locale ?? "en",
            defaultCurrency: profile.defaultCurrency ?? "USD",
          }
        : null,
      savedCities: saved,
      ownedTrips,
      memberships,
    }
  })
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;")
}

function foldIcsLine(line: string): string {
  const lines: string[] = []
  let current = ""
  let bytes = 0
  let limit = 75

  for (const character of line) {
    const width = Buffer.byteLength(character, "utf8")
    if (bytes + width > limit && current) {
      lines.push(current)
      current = " "
      bytes = 1
      limit = 75
    }
    current += character
    bytes += width
  }
  lines.push(current)
  return lines.join("\r\n")
}

function compactDate(value: string): string {
  return value.replaceAll("-", "")
}

function compactLocalDateTime(date: string, time: string): string {
  return `${compactDate(date)}T${time.replaceAll(":", "")}`
}

function compactUtcDateTime(value: Date): string {
  return value.toISOString().replaceAll(/[-:]/g, "").replace(".000", "")
}

type CalendarEvent = { lines: string[]; sortKey: string }

export async function buildAccountCalendar(database: Database, userId: string, generatedAt: Date) {
  const itemRows = await database
    .select({ item: itineraryItems, timezone: cities.timezone, tripName: trips.name })
    .from(itineraryItems)
    .innerJoin(tripStops, eq(tripStops.id, itineraryItems.tripStopId))
    .innerJoin(cities, eq(cities.id, tripStops.cityId))
    .innerJoin(trips, eq(trips.id, tripStops.tripId))
    .where(accessibleTripCondition(userId))
    .orderBy(
      asc(itineraryItems.scheduledDate),
      asc(itineraryItems.startTime),
      asc(itineraryItems.id),
    )

  const legRows = await database
    .select({ leg: tripLegs, tripName: trips.name })
    .from(tripLegs)
    .innerJoin(trips, eq(trips.id, tripLegs.tripId))
    .where(accessibleTripCondition(userId))
    .orderBy(asc(tripLegs.departureAt), asc(tripLegs.id))

  const stamp = compactUtcDateTime(generatedAt)
  const events: CalendarEvent[] = []
  for (const { item, timezone, tripName } of itemRows) {
    const lines = [
      "BEGIN:VEVENT",
      `UID:item-${item.id}@globetrotter`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${escapeIcsText(item.title)}`,
      `CATEGORIES:${escapeIcsText(tripName)}`,
    ]
    if (item.startTime) {
      lines.push(
        `DTSTART;TZID=${timezone}:${compactLocalDateTime(item.scheduledDate, item.startTime)}`,
      )
      if (item.endDate && item.endTime) {
        lines.push(`DTEND;TZID=${timezone}:${compactLocalDateTime(item.endDate, item.endTime)}`)
      } else if (item.durationMinutes) {
        lines.push(`DURATION:PT${item.durationMinutes}M`)
      }
    } else {
      // RFC 5545 all-day end dates are exclusive, matching the domain's Stay checkout.
      lines.push(`DTSTART;VALUE=DATE:${compactDate(item.scheduledDate)}`)
      lines.push(`DTEND;VALUE=DATE:${compactDate(item.endDate ?? addDays(item.scheduledDate, 1))}`)
    }
    if (item.description) lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`)
    lines.push("END:VEVENT")
    events.push({ lines, sortKey: `${item.scheduledDate}T${item.startTime ?? "00:00:00"}` })
  }

  for (const { leg, tripName } of legRows) {
    events.push({
      sortKey: leg.departureAt.toISOString(),
      lines: [
        "BEGIN:VEVENT",
        `UID:leg-${leg.id}@globetrotter`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compactUtcDateTime(leg.departureAt)}`,
        `DTEND:${compactUtcDateTime(leg.arrivalAt)}`,
        `SUMMARY:${escapeIcsText(leg.title)}`,
        `CATEGORIES:${escapeIcsText(tripName)}`,
        "END:VEVENT",
      ],
    })
  }

  const sortedEvents = events.toSorted((left, right) => left.sortKey.localeCompare(right.sortKey))
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GlobeTrotter//Trip Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...sortedEvents.flatMap((event) => event.lines),
    "END:VCALENDAR",
  ]
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`
}
