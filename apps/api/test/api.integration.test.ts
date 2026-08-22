import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"

import {
  activities,
  activityCategories,
  cities,
  countries,
  createDatabase,
  user,
} from "@globetrotter/db"
import { eq, like } from "drizzle-orm"
import pino from "pino"

import { createApp } from "../src/app.ts"
import type { AuthBoundary } from "../src/context.ts"

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://globetrotter:globetrotter@localhost:5432/globetrotter"
const { database, pool } = createDatabase(connectionString)
const origin = "http://api-integration.test"

const users = {
  alice: { id: `api-test-alice-${randomUUID()}`, email: `alice-${randomUUID()}@example.test` },
  bob: { id: `api-test-bob-${randomUUID()}`, email: `bob-${randomUUID()}@example.test` },
  carol: { id: `api-test-carol-${randomUUID()}`, email: `carol-${randomUUID()}@example.test` },
}

const auth: AuthBoundary = {
  getSession: async (headers) => {
    const id = headers.get("X-Test-User-Id")
    const account = Object.values(users).find((candidate) => candidate.id === id)
    return account
      ? {
          session: { id: `session-${account.id}` },
          user: { id: account.id, email: account.email, name: account.id },
        }
      : null
  },
  handler: () => Promise.resolve(new Response(null, { status: 404 })),
}

const app = createApp({
  auth,
  database,
  logger: pino({ level: "silent" }),
  trustedOrigins: new Set([origin]),
  webOrigin: origin,
})

let tokyoId = 0
let parisId = 0
let tokyoActivityId = 0
let parisActivityId = 0

type RequestOptions = {
  body?: unknown
  etag?: string
  userId?: string
}

function request(method: string, path: string, options: RequestOptions = {}) {
  const headers = new Headers()
  if (options.userId) headers.set("X-Test-User-Id", options.userId)
  if (options.etag) headers.set("If-Match", options.etag)
  if (options.body !== undefined) headers.set("Content-Type", "application/json")
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("Origin", origin)

  return app.request(`http://localhost${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
}

async function jsonData<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

async function expectProblem(response: Response, status: number, type: string): Promise<void> {
  assert.equal(response.status, status, await response.clone().text())
  assert.equal((await jsonData<{ type: string }>(response)).type, type)
}

async function createTripFixture(
  ownerId: string,
  input: {
    baseCurrency: string
    budgetLimit?: string
    endDate: string
    name: string
    startDate: string
    visibility?: "private" | "public"
  },
): Promise<{ etag: string; id: string }> {
  const response = await request("POST", "/api/v1/trips", { body: input, userId: ownerId })
  assert.equal(response.status, 201, await response.clone().text())
  const etag = response.headers.get("ETag")
  assert.ok(etag)
  const body = await jsonData<{ data: { id: string } }>(response)
  return { etag, id: body.data.id }
}

async function addStopFixture(
  ownerId: string,
  trip: { etag: string; id: string },
  input: { cityId: string; endDate: string; startDate: string },
): Promise<{ etag: string; id: string }> {
  const response = await request("POST", `/api/v1/trips/${trip.id}/stops`, {
    body: input,
    etag: trip.etag,
    userId: ownerId,
  })
  assert.equal(response.status, 201, await response.clone().text())
  const etag = response.headers.get("ETag")
  assert.ok(etag)
  const body = await jsonData<{ data: { id: string } }>(response)
  return { etag, id: body.data.id }
}

before(async () => {
  await database.delete(user).where(like(user.id, "api-test-%"))

  const staleCities = await database
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.countryCode, "QZ"))
  await Promise.all(
    staleCities.map((staleCity) =>
      database.delete(activities).where(eq(activities.cityId, staleCity.id)),
    ),
  )
  await database.delete(cities).where(eq(cities.countryCode, "QZ"))
  await database.delete(countries).where(eq(countries.code, "QZ"))

  await database.insert(user).values([
    { id: users.alice.id, email: users.alice.email, name: "Alice API Test" },
    { id: users.bob.id, email: users.bob.email, name: "Bob API Test" },
    { id: users.carol.id, email: users.carol.email, name: "Carol API Test" },
  ])
  await database.insert(countries).values({ code: "QZ", name: "API Testland" })

  const insertedCities = await database
    .insert(cities)
    .values([
      {
        countryCode: "QZ",
        name: "Test Tokyo",
        timezone: "Asia/Tokyo",
        latitude: "35.676200",
        longitude: "139.650300",
      },
      {
        countryCode: "QZ",
        name: "Test Paris",
        timezone: "Europe/Paris",
        latitude: "48.856600",
        longitude: "2.352200",
      },
    ])
    .returning({ id: cities.id, name: cities.name })
  tokyoId = insertedCities.find((city) => city.name === "Test Tokyo")!.id
  parisId = insertedCities.find((city) => city.name === "Test Paris")!.id

  const [category] = await database
    .select({ id: activityCategories.id })
    .from(activityCategories)
    .limit(1)
  assert.ok(category)

  const insertedActivities = await database
    .insert(activities)
    .values([
      {
        cityId: tokyoId,
        categoryId: category.id,
        name: "Test Tokyo Tower",
        defaultDurationMinutes: 120,
        estimatedCost: "3000.0000",
        currency: "JPY",
      },
      {
        cityId: parisId,
        categoryId: category.id,
        name: "Test Paris Museum",
        defaultDurationMinutes: 90,
        estimatedCost: "40.0000",
        currency: "EUR",
      },
    ])
    .returning({ id: activities.id, name: activities.name })
  tokyoActivityId = insertedActivities.find((activity) => activity.name === "Test Tokyo Tower")!.id
  parisActivityId = insertedActivities.find((activity) => activity.name === "Test Paris Museum")!.id
})

after(async () => {
  await database.delete(user).where(like(user.id, "api-test-%"))
  await database.delete(activities).where(eq(activities.cityId, tokyoId))
  await database.delete(activities).where(eq(activities.cityId, parisId))
  await database.delete(cities).where(eq(cities.countryCode, "QZ"))
  await database.delete(countries).where(eq(countries.code, "QZ"))
  await pool.end()
})

test("Trip planning mutations enforce access, invariants, and optimistic concurrency", async () => {
  assert.equal((await request("GET", "/api/v1/trips")).status, 401)

  const trip = await createTripFixture(users.alice.id, {
    name: "Japan mutation test",
    startDate: "2027-01-01",
    endDate: "2027-01-10",
    budgetLimit: "100000.0000",
    baseCurrency: "INR",
  })

  await expectProblem(
    await request("PATCH", `/api/v1/trips/${trip.id}`, {
      userId: users.alice.id,
      body: { name: "Missing ETag" },
    }),
    428,
    "PRECONDITION_REQUIRED",
  )
  await expectProblem(
    await request("GET", `/api/v1/trips/${trip.id}`, { userId: users.bob.id }),
    404,
    "TRIP_NOT_FOUND",
  )
  await expectProblem(
    await request("POST", `/api/v1/trips/${trip.id}/stops`, {
      userId: users.alice.id,
      etag: trip.etag,
      body: {
        cityId: String(tokyoId),
        startDate: "2027-01-08",
        endDate: "2027-01-12",
      },
    }),
    409,
    "STOP_OUTSIDE_TRIP",
  )

  const stop = await addStopFixture(users.alice.id, trip, {
    cityId: String(tokyoId),
    startDate: "2027-01-01",
    endDate: "2027-01-05",
  })
  assert.equal(stop.etag, '"2"')

  await expectProblem(
    await request("POST", `/api/v1/trips/${trip.id}/stops`, {
      userId: users.alice.id,
      etag: stop.etag,
      body: {
        cityId: String(parisId),
        startDate: "2027-01-04",
        endDate: "2027-01-08",
      },
    }),
    409,
    "STOP_DATE_OVERLAP",
  )
  await expectProblem(
    await request("POST", `/api/v1/trips/${trip.id}/stops/${stop.id}/items`, {
      userId: users.alice.id,
      etag: stop.etag,
      body: {
        sourceActivityId: String(parisActivityId),
        scheduledDate: "2027-01-02",
        estimatedCost: "1000.0000",
      },
    }),
    409,
    "CATALOG_ACTIVITY_CITY_MISMATCH",
  )
  await expectProblem(
    await request("POST", `/api/v1/trips/${trip.id}/stops/${stop.id}/items`, {
      userId: users.alice.id,
      etag: stop.etag,
      body: {
        sourceActivityId: String(tokyoActivityId),
        scheduledDate: "2027-01-02",
      },
    }),
    422,
    "CURRENCY_CONVERSION_REQUIRED",
  )
  await expectProblem(
    await request("POST", `/api/v1/trips/${trip.id}/stops/${stop.id}/items`, {
      userId: users.alice.id,
      etag: stop.etag,
      body: {
        kind: "meal",
        title: "Departure-day dinner",
        scheduledDate: "2027-01-05",
        estimatedCost: "100.0000",
      },
    }),
    409,
    "ITINERARY_ITEM_OUTSIDE_STOP",
  )

  const addItem = await request("POST", `/api/v1/trips/${trip.id}/stops/${stop.id}/items`, {
    userId: users.alice.id,
    etag: stop.etag,
    body: {
      kind: "meal",
      title: "Valid dinner",
      scheduledDate: "2027-01-03",
      startTime: "19:30:00",
      durationMinutes: 90,
      estimatedCost: "2200.0000",
    },
  })
  assert.equal(addItem.status, 201, await addItem.clone().text())
  assert.equal(addItem.headers.get("ETag"), '"3"')
  const item = await jsonData<{ data: { id: string } }>(addItem)

  await expectProblem(
    await request("PATCH", `/api/v1/trips/${trip.id}/stops/${stop.id}`, {
      userId: users.alice.id,
      etag: '"3"',
      body: { endDate: "2027-01-03" },
    }),
    409,
    "STOP_DATE_CONFLICT",
  )
  await expectProblem(
    await request("PATCH", `/api/v1/trips/${trip.id}`, {
      userId: users.alice.id,
      etag: '"3"',
      body: { baseCurrency: "USD" },
    }),
    409,
    "TRIP_CURRENCY_LOCKED",
  )
  await expectProblem(
    await request("PATCH", `/api/v1/trips/${trip.id}`, {
      userId: users.alice.id,
      etag: '"3"',
      body: { startDate: "2027-01-02" },
    }),
    409,
    "TRIP_DATE_CONFLICT",
  )

  const firstWrite = await request("PATCH", `/api/v1/trips/${trip.id}`, {
    userId: users.alice.id,
    etag: '"3"',
    body: { name: "Fresh update" },
  })
  assert.equal(firstWrite.status, 200, await firstWrite.clone().text())
  assert.equal(firstWrite.headers.get("ETag"), '"4"')
  await expectProblem(
    await request("PATCH", `/api/v1/trips/${trip.id}`, {
      userId: users.alice.id,
      etag: '"3"',
      body: { name: "Stale update" },
    }),
    412,
    "STALE_TRIP_VERSION",
  )
  await expectProblem(
    await request("PUT", `/api/v1/trips/${trip.id}/stops/order`, {
      userId: users.alice.id,
      etag: '"4"',
      body: { stopIds: [] },
    }),
    409,
    "INVALID_STOP_ORDER",
  )

  const otherTrip = await createTripFixture(users.bob.id, {
    name: "Nested identifier test",
    startDate: "2027-02-01",
    endDate: "2027-02-10",
    baseCurrency: "USD",
  })
  const otherStop = await addStopFixture(users.bob.id, otherTrip, {
    cityId: String(parisId),
    startDate: "2027-02-01",
    endDate: "2027-02-05",
  })
  await expectProblem(
    await request(
      "PATCH",
      `/api/v1/trips/${otherTrip.id}/stops/${otherStop.id}/items/${item.data.id}`,
      {
        userId: users.bob.id,
        etag: otherStop.etag,
        body: { title: "Stolen mutation" },
      },
    ),
    404,
    "ITINERARY_ITEM_NOT_FOUND",
  )
})

// TESTS
