import { relations, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  bigint,
  char,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { user } from "./auth.ts"

const createdAt = timestamp("created_at", { mode: "date", withTimezone: true })
  .defaultNow()
  .notNull()

const updatedAt = timestamp("updated_at", { mode: "date", withTimezone: true })
  .defaultNow()
  .notNull()

export const tripVisibility = pgEnum("trip_visibility", ["private", "public"])
export const tripMemberRole = pgEnum("trip_member_role", ["viewer", "editor"])
export const itineraryItemKind = pgEnum("itinerary_item_kind", [
  "activity",
  "transport",
  "stay",
  "meal",
  "note",
  "other",
])

export const countries = pgTable("countries", {
  code: char("code", { length: 2 }).primaryKey(),
  name: text("name").notNull().unique(),
})

export const cities = pgTable(
  "cities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code),
    name: text("name").notNull(),
    region: text("region"),
    timezone: text("timezone").notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: numeric("longitude", { precision: 9, scale: 6 }).notNull(),
    costIndex: numeric("cost_index", { precision: 8, scale: 2 }),
    description: text("description"),
    imageUrl: text("image_url"),
    createdAt,
  },
  (table) => [index("cities_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops"))],
)

export const activityCategories = pgTable("activity_categories", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
})

export const activities = pgTable(
  "activities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    cityId: bigint("city_id", { mode: "number" })
      .notNull()
      .references(() => cities.id),
    categoryId: bigint("category_id", { mode: "number" })
      .notNull()
      .references(() => activityCategories.id),
    name: text("name").notNull(),
    description: text("description"),
    defaultDurationMinutes: integer("default_duration_minutes"),
    estimatedCost: numeric("estimated_cost", { precision: 18, scale: 4 }),
    currency: char("currency", { length: 3 }),
    imageUrl: text("image_url"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("activities_city_category_cost_idx").on(
      table.cityId,
      table.categoryId,
      table.estimatedCost,
    ),
    index("activities_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops")),
  ],
)

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    coverImageKey: text("cover_image_key"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    budgetLimit: numeric("budget_limit", { precision: 18, scale: 4 }),
    baseCurrency: char("base_currency", { length: 3 }).notNull(),
    visibility: tripVisibility("visibility").default("private").notNull(),
    version: integer("version").default(1).notNull(),
    copiedFromTripId: uuid("copied_from_trip_id").references((): AnyPgColumn => trips.id, {
      onDelete: "set null",
    }),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("trips_date_range_check", sql`${table.endDate} > ${table.startDate}`),
    check(
      "trips_budget_limit_check",
      sql`${table.budgetLimit} is null or ${table.budgetLimit} >= 0`,
    ),
    check("trips_version_check", sql`${table.version} >= 1`),
    index("trips_owner_start_date_idx").on(table.ownerId, table.startDate.desc()),
    index("public_trips_created_idx")
      .on(table.createdAt.desc())
      .where(sql`${table.visibility} = 'public'`),
  ],
)

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: tripMemberRole("role").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.tripId, table.userId] }),
    index("trip_members_user_idx").on(table.userId),
  ],
)

export const tripStops = pgTable(
  "trip_stops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    cityId: bigint("city_id", { mode: "number" })
      .notNull()
      .references(() => cities.id),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    position: integer("position").notNull(),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("trip_stops_date_range_check", sql`${table.endDate} > ${table.startDate}`),
    check("trip_stops_position_check", sql`${table.position} >= 0`),
    uniqueIndex("trip_stops_trip_position_idx").on(table.tripId, table.position),
    index("trip_stops_city_idx").on(table.cityId),
  ],
)

export const itineraryItems = pgTable(
  "itinerary_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripStopId: uuid("trip_stop_id")
      .notNull()
      .references(() => tripStops.id, { onDelete: "cascade" }),
    sourceActivityId: bigint("source_activity_id", { mode: "number" }).references(
      () => activities.id,
      { onDelete: "set null" },
    ),
    kind: itineraryItemKind("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    startTime: time("start_time", { precision: 0 }),
    durationMinutes: integer("duration_minutes"),
    estimatedCost: numeric("estimated_cost", { precision: 18, scale: 4 }).notNull(),
    position: integer("position").notNull(),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("itinerary_items_estimated_cost_check", sql`${table.estimatedCost} >= 0`),
    check("itinerary_items_position_check", sql`${table.position} >= 0`),
    check(
      "itinerary_items_duration_minutes_check",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
    check(
      "itinerary_items_source_activity_kind_check",
      sql`${table.sourceActivityId} is null or ${table.kind} = 'activity'`,
    ),
    index("itinerary_stop_schedule_idx").on(
      table.tripStopId,
      table.scheduledDate,
      table.startTime,
      table.position,
    ),
    index("itinerary_source_activity_idx").on(table.sourceActivityId),
  ],
)

export const tripShareLinks = pgTable(
  "trip_share_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
    createdAt,
  },
  (table) => [index("trip_share_links_trip_idx").on(table.tripId)],
)

export const savedCities = pgTable(
  "saved_cities",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cityId: bigint("city_id", { mode: "number" })
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.userId, table.cityId] })],
)

export const userTravelRelations = relations(user, ({ many }) => ({
  ownedTrips: many(trips, { relationName: "tripOwner" }),
  tripMemberships: many(tripMembers),
  createdShareLinks: many(tripShareLinks, { relationName: "shareLinkCreator" }),
  savedCities: many(savedCities),
}))

export const countryRelations = relations(countries, ({ many }) => ({
  cities: many(cities),
}))

export const cityRelations = relations(cities, ({ many, one }) => ({
  country: one(countries, {
    fields: [cities.countryCode],
    references: [countries.code],
  }),
  activities: many(activities),
  tripStops: many(tripStops),
  savedByUsers: many(savedCities),
}))

export const activityCategoryRelations = relations(activityCategories, ({ many }) => ({
  activities: many(activities),
}))

export const activityRelations = relations(activities, ({ many, one }) => ({
  city: one(cities, { fields: [activities.cityId], references: [cities.id] }),
  category: one(activityCategories, {
    fields: [activities.categoryId],
    references: [activityCategories.id],
  }),
  itineraryItems: many(itineraryItems),
}))

export const tripRelations = relations(trips, ({ many, one }) => ({
  owner: one(user, {
    relationName: "tripOwner",
    fields: [trips.ownerId],
    references: [user.id],
  }),
  copiedFrom: one(trips, {
    relationName: "tripCopies",
    fields: [trips.copiedFromTripId],
    references: [trips.id],
  }),
  copies: many(trips, { relationName: "tripCopies" }),
  members: many(tripMembers),
  stops: many(tripStops),
  shareLinks: many(tripShareLinks),
}))

export const tripMemberRelations = relations(tripMembers, ({ one }) => ({
  trip: one(trips, { fields: [tripMembers.tripId], references: [trips.id] }),
  user: one(user, { fields: [tripMembers.userId], references: [user.id] }),
}))

export const tripStopRelations = relations(tripStops, ({ many, one }) => ({
  trip: one(trips, { fields: [tripStops.tripId], references: [trips.id] }),
  city: one(cities, { fields: [tripStops.cityId], references: [cities.id] }),
  itineraryItems: many(itineraryItems),
}))

export const itineraryItemRelations = relations(itineraryItems, ({ one }) => ({
  tripStop: one(tripStops, {
    fields: [itineraryItems.tripStopId],
    references: [tripStops.id],
  }),
  sourceActivity: one(activities, {
    fields: [itineraryItems.sourceActivityId],
    references: [activities.id],
  }),
}))

export const tripShareLinkRelations = relations(tripShareLinks, ({ one }) => ({
  trip: one(trips, { fields: [tripShareLinks.tripId], references: [trips.id] }),
  creator: one(user, {
    relationName: "shareLinkCreator",
    fields: [tripShareLinks.createdBy],
    references: [user.id],
  }),
}))

export const savedCityRelations = relations(savedCities, ({ one }) => ({
  user: one(user, { fields: [savedCities.userId], references: [user.id] }),
  city: one(cities, { fields: [savedCities.cityId], references: [cities.id] }),
}))
