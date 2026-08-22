import assert from "node:assert/strict"
import test from "node:test"

import { snapshotCurrencyConversion } from "../src/index.ts"

test("currency conversion snapshots the source money and rounds to four decimal places", () => {
  assert.deepEqual(
    snapshotCurrencyConversion({
      amount: "3000.0000",
      currency: "JPY",
      effectiveAt: "2027-01-01T00:00:00.000Z",
      provider: "test-rates",
      rate: "0.006700000000",
      targetCurrency: "USD",
    }),
    {
      estimatedCost: "20.1000",
      exchangeRate: "0.006700000000",
      exchangeRateAt: "2027-01-01T00:00:00.000Z",
      exchangeRateProvider: "test-rates",
      originalCost: "3000.0000",
      originalCurrency: "JPY",
    },
  )
})
