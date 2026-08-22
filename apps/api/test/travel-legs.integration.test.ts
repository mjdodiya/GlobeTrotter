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
const origin = "http://travel-leg-integration.test"
const testUser = {
  email: `travel-leg-${randomUUID()}@example.test`,
  id: `travel-leg-test-${randomUUID()}`,
}

const auth: AuthBoundary = {
  getSession: async (headers) =>
    headers.get("X-Test-User-Id") === testUser.id
      ? {
          session: { id: `session-${testUser.id}` },
          user: { id: testUser.id, email: testUser.email, name: "Travel Leg Tester" },
        }
      : null,
  handler: () => Promise.resolve(new Response(null, { status: 404 })),
}

let testExchangeRate = "0.006700000000"

const app = createApp({
  auth,
  database,
  exchangeRates: {
    quote: async () => ({
      effectiveAt: new Date("2027-01-01T00:00:00.000Z"),
      provider: "test-rates",
      rate: testExchangeRate,
    }),
  },
  logger: pino({ level: "silent" }),
  trustedOrigins: new Set([origin]),
  webOrigin: origin,
})

let originCityId = 0
let destinationCityId = 0
let originActivityId = 0

function request(method: string, path: string, options: { body?: unknown; etag?: string } = {}) {
  const headers = new Headers({ "X-Test-User-Id": testUser.id })
  if (options.etag) headers.set("If-Match", options.etag)
  if (options.body !== undefined) headers.set("Content-Type", "application/json")
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("Origin", origin)
  return app.request(`http://localhost${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
}

before(async () => {
  await database.delete(user).where(like(user.id, "travel-leg-test-%"))
  await database.delete(cities).where(eq(cities.countryCode, "QY"))
  await database.delete(countries).where(eq(countries.code, "QY"))
  await database.insert(user).values({
    id: testUser.id,
    email: testUser.email,
    name: "Travel Leg Tester",
    emailVerified: true,
  })
  await database.insert(countries).values({ code: "QY", name: "Travel Leg Testland" })
  const rows = await database
    .insert(cities)
    .values([
      {
        countryCode: "QY",
        latitude: "35.676200",
        longitude: "139.650300",
        name: "Leg Origin",
        timezone: "Asia/Tokyo",
      },
      {
        countryCode: "QY",
        latitude: "48.856600",
        longitude: "2.352200",
        name: "Leg Destination",
        timezone: "Europe/Paris",
      },
    ])
    .returning({ id: cities.id, name: cities.name })
  originCityId = rows.find((city) => city.name === "Leg Origin")!.id
  destinationCityId = rows.find((city) => city.name === "Leg Destination")!.id
  const [category] = await database.select().from(activityCategories).limit(1)
  assert.ok(category)
  const [activity] = await database
    .insert(activities)
    .values({
      categoryId: category.id,
      cityId: originCityId,
      currency: "JPY",
      estimatedCost: "3000.0000",
      name: "Converted activity",
    })
    .returning({ id: activities.id })
  assert.ok(activity)
  originActivityId = activity.id
})

after(async () => {
  await database.delete(user).where(eq(user.id, testUser.id))
  await database.delete(activities).where(eq(activities.cityId, originCityId))
  await database.delete(cities).where(eq(cities.countryCode, "QY"))
  await database.delete(countries).where(eq(countries.code, "QY"))
  await pool.end()
})

test("a catalog activity snapshots and explicitly refreshes currency conversion", async () => {
  const createTrip = await request("POST", "/api/v1/trips", {
    body: {
      baseCurrency: "USD",
      endDate: "2027-03-05",
      name: "Currency Test",
      startDate: "2027-03-01",
    },
  })
  assert.equal(createTrip.status, 201, await createTrip.clone().text())
  const trip = (await createTrip.json()) as { data: { id: string } }
  const addStop = await request("POST", `/api/v1/trips/${trip.data.id}/stops`, {
    etag: '"1"',
    body: {
      cityId: String(originCityId),
      endDate: "2027-03-05",
      startDate: "2027-03-01",
    },
  })
  assert.equal(addStop.status, 201, await addStop.clone().text())
  const stop = (await addStop.json()) as { data: { id: string } }

  const addActivity = await request(
    "POST",
    `/api/v1/trips/${trip.data.id}/stops/${stop.data.id}/items`,
    {
      etag: '"2"',
      body: {
        scheduledDate: "2027-03-02",
        sourceActivityId: String(originActivityId),
      },
    },
  )
  assert.equal(addActivity.status, 201, await addActivity.clone().text())
  const item = (await addActivity.json()) as {
    data: {
      estimatedCost: string
      exchangeRate: string
      exchangeRateProvider: string
      id: string
      originalCost: string
      originalCurrency: string
    }
  }
  assert.deepEqual(
    {
      estimatedCost: item.data.estimatedCost,
      exchangeRate: item.data.exchangeRate,
      exchangeRateProvider: item.data.exchangeRateProvider,
      originalCost: item.data.originalCost,
      originalCurrency: item.data.originalCurrency,
    },
    {
      estimatedCost: "20.1000",
      exchangeRate: "0.006700000000",
      exchangeRateProvider: "test-rates",
      originalCost: "3000.0000",
      originalCurrency: "JPY",
    },
  )

  testExchangeRate = "0.007000000000"
  const preview = await request("POST", `/api/v1/trips/${trip.data.id}/rates/preview`)
  assert.equal(preview.status, 200, await preview.clone().text())
  assert.equal(preview.headers.get("ETag"), '"3"')
  const previewBody = (await preview.json()) as {
    data: {
      changes: Array<{
        id: string
        previousEstimatedCost: string
        refreshedEstimatedCost: string
        type: string
      }>
    }
  }
  assert.deepEqual(
    previewBody.data.changes.map((change) => ({
      id: change.id,
      previousEstimatedCost: change.previousEstimatedCost,
      refreshedEstimatedCost: change.refreshedEstimatedCost,
      type: change.type,
    })),
    [
      {
        id: item.data.id,
        previousEstimatedCost: "20.1000",
        refreshedEstimatedCost: "21.0000",
        type: "itineraryItem",
      },
    ],
  )

  const refreshed = await request("POST", `/api/v1/trips/${trip.data.id}/rates/refresh`, {
    etag: '"3"',
  })
  assert.equal(refreshed.status, 200, await refreshed.clone().text())
  assert.equal(refreshed.headers.get("ETag"), '"4"')
  const refreshedBody = (await refreshed.json()) as {
    data: { changes: Array<{ refreshedEstimatedCost: string }>; version: number }
  }
  assert.equal(refreshedBody.data.version, 4)
  assert.equal(refreshedBody.data.changes[0]?.refreshedEstimatedCost, "21.0000")

  const deletionImpact = await request("GET", "/api/v1/me/deletion-impact")
  assert.equal(deletionImpact.status, 200, await deletionImpact.clone().text())
  const deletionImpactBody = (await deletionImpact.json()) as {
    data: { ownedTrips: number; itineraryItems: number }
  }
  assert.ok(deletionImpactBody.data.ownedTrips >= 1)
  assert.ok(deletionImpactBody.data.itineraryItems >= 1)

  const exported = await request("GET", "/api/v1/me/export")
  assert.equal(exported.status, 200, await exported.clone().text())
  assert.match(exported.headers.get("Content-Disposition") ?? "", /attachment/)
  const exportBody = (await exported.json()) as {
    data: { ownedTrips: Array<{ id: string; planning: { stops: unknown[] } }> }
  }
  assert.ok(exportBody.data.ownedTrips.some((ownedTrip) => ownedTrip.id === trip.data.id))

  const calendar = await request("GET", "/api/v1/me/calendar.ics")
  assert.equal(calendar.status, 200, await calendar.clone().text())
  assert.match(calendar.headers.get("Content-Type") ?? "", /text\/calendar/)
  assert.match(await calendar.text(), /SUMMARY:Converted activity/)
})

test("a traveler stores locale and default currency preferences", async () => {
  const initial = await request("GET", "/api/v1/me")
  assert.equal(initial.status, 200, await initial.clone().text())
  const initialBody = (await initial.json()) as {
    data: { locale: string; defaultCurrency: string; emailVerified: boolean }
  }
  assert.deepEqual(
    {
      locale: initialBody.data.locale,
      defaultCurrency: initialBody.data.defaultCurrency,
      emailVerified: initialBody.data.emailVerified,
    },
    { locale: "en", defaultCurrency: "USD", emailVerified: true },
  )

  const update = await request("PATCH", "/api/v1/me", {
    body: { locale: "en-IN", defaultCurrency: "INR" },
  })
  assert.equal(update.status, 200, await update.clone().text())
  const updateBody = (await update.json()) as {
    data: { locale: string; defaultCurrency: string }
  }
  assert.equal(updateBody.data.locale, "en-IN")
  assert.equal(updateBody.data.defaultCurrency, "INR")
})

test("a participant plans and reads a Travel Leg between adjacent stops", async () => {
  const createTrip = await request("POST", "/api/v1/trips", {
    body: {
      baseCurrency: "USD",
      budgetLimit: "1000.0000",
      endDate: "2027-01-10",
      name: "Travel Leg Test",
      startDate: "2027-01-01",
    },
  })
  assert.equal(createTrip.status, 201, await createTrip.clone().text())
  const trip = (await createTrip.json()) as { data: { id: string } }

  const addOrigin = await request("POST", `/api/v1/trips/${trip.data.id}/stops`, {
    etag: '"1"',
    body: {
      cityId: String(originCityId),
      endDate: "2027-01-04",
      startDate: "2027-01-01",
    },
  })
  assert.equal(addOrigin.status, 201, await addOrigin.clone().text())
  const originStop = (await addOrigin.json()) as { data: { id: string } }

  const addDestination = await request("POST", `/api/v1/trips/${trip.data.id}/stops`, {
    etag: '"2"',
    body: {
      cityId: String(destinationCityId),
      endDate: "2027-01-08",
      startDate: "2027-01-04",
    },
  })
  assert.equal(addDestination.status, 201, await addDestination.clone().text())
  const destinationStop = (await addDestination.json()) as { data: { id: string } }

  const invalid = await request("POST", `/api/v1/trips/${trip.data.id}/legs`, {
    etag: '"3"',
    body: {
      arrivalAt: "2027-01-04T08:00:00.000Z",
      departureAt: "2027-01-04T09:00:00.000Z",
      estimatedCost: "150.0000",
      fromStopId: originStop.data.id,
      mode: "flight",
      title: "Impossible flight",
      toStopId: destinationStop.data.id,
    },
  })
  assert.equal(invalid.status, 409)
  assert.equal(((await invalid.json()) as { type: string }).type, "TRAVEL_LEG_TIME_CONFLICT")

  const created = await request("POST", `/api/v1/trips/${trip.data.id}/legs`, {
    etag: '"3"',
    body: {
      arrivalAt: "2027-01-04T18:00:00.000Z",
      departureAt: "2027-01-04T03:00:00.000Z",
      estimatedCost: "150.0000",
      fromStopId: originStop.data.id,
      mode: "flight",
      title: "Tokyo to Paris",
      toStopId: destinationStop.data.id,
    },
  })
  assert.equal(created.status, 201, await created.clone().text())
  assert.equal(created.headers.get("ETag"), '"4"')
  const createdLeg = (await created.clone().json()) as { data: { id: string } }

  const relabelCosts = await request("PATCH", `/api/v1/trips/${trip.data.id}`, {
    etag: '"4"',
    body: { baseCurrency: "EUR" },
  })
  assert.equal(relabelCosts.status, 409)
  assert.equal(((await relabelCosts.json()) as { type: string }).type, "TRIP_CURRENCY_LOCKED")

  const itinerary = await request("GET", `/api/v1/trips/${trip.data.id}/itinerary`)
  assert.equal(itinerary.status, 200, await itinerary.clone().text())
  const body = (await itinerary.json()) as {
    data: { legs: Array<{ title: string; departureTimezone: string; arrivalTimezone: string }> }
  }
  assert.deepEqual(
    body.data.legs.map(({ title, departureTimezone, arrivalTimezone }) => ({
      title,
      departureTimezone,
      arrivalTimezone,
    })),
    [
      {
        arrivalTimezone: "Europe/Paris",
        departureTimezone: "Asia/Tokyo",
        title: "Tokyo to Paris",
      },
    ],
  )

  const preview = await request("POST", `/api/v1/trips/${trip.data.id}/stops/order/preview`, {
    body: { stopIds: [destinationStop.data.id, originStop.data.id] },
  })
  assert.equal(preview.status, 200, await preview.clone().text())
  const previewBody = (await preview.json()) as {
    data: {
      affectedLegIds: string[]
      stops: Array<{ id: string; startDate: string; endDate: string }>
    }
  }
  assert.deepEqual(previewBody.data, {
    affectedLegIds: [createdLeg.data.id],
    stops: [
      { id: destinationStop.data.id, startDate: "2027-01-01", endDate: "2027-01-05" },
      { id: originStop.data.id, startDate: "2027-01-05", endDate: "2027-01-08" },
    ],
  })

  const reordered = await request("PUT", `/api/v1/trips/${trip.data.id}/stops/order`, {
    etag: '"4"',
    body: {
      removeLegIds: [createdLeg.data.id],
      stopIds: [destinationStop.data.id, originStop.data.id],
    },
  })
  assert.equal(reordered.status, 200, await reordered.clone().text())
  assert.equal(reordered.headers.get("ETag"), '"5"')

  const invalidStay = await request(
    "POST",
    `/api/v1/trips/${trip.data.id}/stops/${destinationStop.data.id}/items`,
    {
      etag: '"5"',
      body: {
        endDate: "2027-01-06",
        endTime: "11:00:00",
        estimatedCost: "400.0000",
        kind: "stay",
        scheduledDate: "2027-01-01",
        startTime: "15:00:00",
        title: "Paris stay",
      },
    },
  )
  assert.equal(invalidStay.status, 409)
  assert.equal(((await invalidStay.json()) as { type: string }).type, "STAY_OUTSIDE_STOP")

  const stay = await request(
    "POST",
    `/api/v1/trips/${trip.data.id}/stops/${destinationStop.data.id}/items`,
    {
      etag: '"5"',
      body: {
        endDate: "2027-01-05",
        endTime: "11:00:00",
        estimatedCost: "400.0000",
        kind: "stay",
        scheduledDate: "2027-01-01",
        startTime: "15:00:00",
        title: "Paris stay",
        notes: "Reservation secret",
      },
    },
  )
  assert.equal(stay.status, 201, await stay.clone().text())
  assert.equal(stay.headers.get("ETag"), '"6"')

  const returnLeg = await request("POST", `/api/v1/trips/${trip.data.id}/legs`, {
    etag: '"6"',
    body: {
      arrivalAt: "2027-01-05T18:00:00.000Z",
      departureAt: "2027-01-05T03:00:00.000Z",
      estimatedCost: "150.0000",
      fromStopId: destinationStop.data.id,
      mode: "flight",
      title: "Paris to Tokyo",
      toStopId: originStop.data.id,
      notes: "PNR secret",
    },
  })
  assert.equal(returnLeg.status, 201, await returnLeg.clone().text())

  const budget = await request("GET", `/api/v1/trips/${trip.data.id}/budget`)
  assert.equal(budget.status, 200, await budget.clone().text())
  const budgetBody = (await budget.json()) as {
    data: {
      breakdown: { stay: string; transport: string }
      days: Array<{ date: string; estimatedCost: string }>
      estimatedTotal: string
    }
  }
  assert.equal(budgetBody.data.estimatedTotal, "550.0000")
  assert.equal(budgetBody.data.breakdown.stay, "400.0000")
  assert.equal(budgetBody.data.breakdown.transport, "150.0000")
  assert.deepEqual(budgetBody.data.days, [
    { date: "2027-01-01", estimatedCost: "100.0000", overAverageBudget: false },
    { date: "2027-01-02", estimatedCost: "100.0000", overAverageBudget: false },
    { date: "2027-01-03", estimatedCost: "100.0000", overAverageBudget: false },
    { date: "2027-01-04", estimatedCost: "100.0000", overAverageBudget: false },
    { date: "2027-01-05", estimatedCost: "150.0000", overAverageBudget: true },
  ])

  const publish = await request("PATCH", `/api/v1/trips/${trip.data.id}`, {
    etag: '"7"',
    body: { visibility: "public" },
  })
  assert.equal(publish.status, 200, await publish.clone().text())
  const publicTrip = await request("GET", `/api/v1/public/trips/${trip.data.id}`)
  assert.equal(publicTrip.status, 200, await publicTrip.clone().text())
  const publicBody = (await publicTrip.json()) as {
    data: {
      budgetLimit?: string
      legs: Array<{ notes?: string }>
      stops: Array<{ notes?: string; items: Array<{ notes?: string }> }>
    }
  }
  assert.equal(publicBody.data.budgetLimit, undefined)
  assert.equal(publicBody.data.stops[0]?.notes, undefined)
  assert.equal(publicBody.data.stops[0]?.items[0]?.notes, undefined)
  assert.equal(publicBody.data.legs[0]?.notes, undefined)
})
