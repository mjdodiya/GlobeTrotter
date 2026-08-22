import assert from "node:assert/strict"
import test from "node:test"

import { allocateEstimatedCosts } from "../src/index.ts"

test("daily budget allocation spreads stays and charges travel on departure", () => {
  const result = allocateEstimatedCosts([
    {
      amount: "300.0000",
      endDate: "2027-01-04",
      id: "stay-1",
      kind: "stay",
      startDate: "2027-01-01",
    },
    {
      amount: "90.0000",
      id: "leg-1",
      kind: "travel-leg",
      startDate: "2027-01-03",
    },
    {
      amount: "10.0000",
      id: "meal-1",
      kind: "item",
      startDate: "2027-01-02",
    },
  ])

  assert.deepEqual(result, {
    estimatedTotal: "400.0000",
    days: [
      { date: "2027-01-01", estimatedCost: "100.0000" },
      { date: "2027-01-02", estimatedCost: "110.0000" },
      { date: "2027-01-03", estimatedCost: "190.0000" },
    ],
  })
})
