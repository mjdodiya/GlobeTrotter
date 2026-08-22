import assert from "node:assert/strict"
import test from "node:test"

import { evaluateTripSchedule, planStopReorder, requireStayWithinStopPeriod } from "../src/index.ts"

test("reordering stops preserves stop durations and the gaps between route positions", () => {
  const result = planStopReorder({
    legs: [{ id: "leg-a-b", fromStopId: "stop-a", toStopId: "stop-b" }],
    order: ["stop-b", "stop-a"],
    stops: [
      { id: "stop-a", startDate: "2027-01-01", endDate: "2027-01-03" },
      { id: "stop-b", startDate: "2027-01-04", endDate: "2027-01-07" },
    ],
  })

  assert.deepEqual(result.stops, [
    { id: "stop-b", startDate: "2027-01-01", endDate: "2027-01-04" },
    { id: "stop-a", startDate: "2027-01-05", endDate: "2027-01-07" },
  ])
  assert.deepEqual(result.affectedLegIds, ["leg-a-b"])
})

test("reordering rejects anything other than a complete stop permutation", () => {
  assert.throws(
    () =>
      planStopReorder({
        legs: [],
        order: ["stop-a", "stop-a"],
        stops: [
          { id: "stop-a", startDate: "2027-01-01", endDate: "2027-01-03" },
          { id: "stop-b", startDate: "2027-01-03", endDate: "2027-01-05" },
        ],
      }),
    { name: "DomainError", code: "INVALID_STOP_ORDER" },
  )
})

test("schedule evaluation rejects a Travel Leg whose arrival is not after departure", () => {
  assert.throws(
    () =>
      evaluateTripSchedule({
        legs: [
          {
            arrivalAt: "2027-01-03T08:00:00.000Z",
            departureAt: "2027-01-03T09:00:00.000Z",
            fromStopId: "stop-a",
            id: "leg-a-b",
            toStopId: "stop-b",
          },
        ],
        stays: [],
        stops: [
          {
            endDate: "2027-01-03",
            id: "stop-a",
            startDate: "2027-01-01",
            timezone: "Asia/Tokyo",
          },
          {
            endDate: "2027-01-06",
            id: "stop-b",
            startDate: "2027-01-03",
            timezone: "Europe/Paris",
          },
        ],
        trip: { startDate: "2027-01-01", endDate: "2027-01-06" },
      }),
    { name: "DomainError", code: "TRAVEL_LEG_TIME_CONFLICT" },
  )
})

test("schedule evaluation exposes route and calendar planning gaps without blocking the trip", () => {
  const warnings = evaluateTripSchedule({
    legs: [],
    stays: [],
    stops: [
      {
        endDate: "2027-01-03",
        id: "stop-a",
        startDate: "2027-01-01",
        timezone: "Asia/Tokyo",
      },
      {
        endDate: "2027-01-07",
        id: "stop-b",
        startDate: "2027-01-04",
        timezone: "Europe/Paris",
      },
    ],
    trip: { startDate: "2027-01-01", endDate: "2027-01-08" },
  })

  assert.deepEqual(
    warnings.map((warning) => warning.code),
    [
      "UNPLANNED_DAYS",
      "MISSING_TRAVEL_LEG",
      "UNPLANNED_DAYS",
      "ACCOMMODATION_GAP",
      "ACCOMMODATION_GAP",
    ],
  )
})

test("a Stay may check out on the stop's excluded end date but not after it", () => {
  assert.doesNotThrow(() =>
    requireStayWithinStopPeriod(
      { startDate: "2027-01-01", endDate: "2027-01-05" },
      {
        checkInDate: "2027-01-01",
        checkInTime: "15:00:00",
        checkOutDate: "2027-01-05",
        checkOutTime: "11:00:00",
      },
    ),
  )
  assert.throws(
    () =>
      requireStayWithinStopPeriod(
        { startDate: "2027-01-01", endDate: "2027-01-05" },
        {
          checkInDate: "2027-01-02",
          checkInTime: "15:00:00",
          checkOutDate: "2027-01-06",
          checkOutTime: "11:00:00",
        },
      ),
    { name: "DomainError", code: "STAY_OUTSIDE_STOP" },
  )
})

test("schedule evaluation warns about accommodation and out-of-stop Travel Leg timing", () => {
  const warnings = evaluateTripSchedule({
    legs: [
      {
        arrivalAt: "2027-01-04T10:00:00.000Z",
        departureAt: "2027-01-04T01:00:00.000Z",
        fromStopId: "stop-a",
        id: "leg-a-b",
        toStopId: "stop-b",
      },
    ],
    stays: [
      {
        checkInDate: "2027-01-01",
        checkOutDate: "2027-01-02",
        id: "stay-a",
        stopId: "stop-a",
      },
    ],
    stops: [
      {
        endDate: "2027-01-03",
        id: "stop-a",
        startDate: "2027-01-01",
        timezone: "Asia/Tokyo",
      },
      {
        endDate: "2027-01-05",
        id: "stop-b",
        startDate: "2027-01-03",
        timezone: "Europe/Paris",
      },
    ],
    trip: { startDate: "2027-01-01", endDate: "2027-01-05" },
  })

  assert.deepEqual(
    warnings.map((warning) => warning.code),
    ["TRAVEL_LEG_DEPARTURE_OUTSIDE_ORIGIN", "ACCOMMODATION_GAP", "ACCOMMODATION_GAP"],
  )
})
