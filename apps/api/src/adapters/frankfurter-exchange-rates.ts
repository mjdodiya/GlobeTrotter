import { DomainError } from "@globetrotter/domain"
import { z } from "zod"

import type { ExchangeRateProvider } from "../context.ts"

const rateResponseSchema = z.object({
  base: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quote: z.string(),
  rate: z.number().positive(),
})

export function createFrankfurterExchangeRates(
  baseUrl = "https://api.frankfurter.dev/v2",
): ExchangeRateProvider {
  return {
    async quote({ fromCurrency, toCurrency }) {
      const url = new URL(
        `rate/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}`,
        `${baseUrl.replace(/\/$/, "")}/`,
      )
      let response: Response
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      } catch (cause) {
        throw new DomainError(
          "CURRENCY_CONVERSION_REQUIRED",
          `Enter the Estimated Cost in ${toCurrency}; the exchange-rate provider is unavailable.`,
          { cause },
        )
      }
      if (!response.ok) {
        throw new DomainError(
          "CURRENCY_CONVERSION_REQUIRED",
          `Enter the Estimated Cost in ${toCurrency}; no exchange rate is available.`,
        )
      }
      const result = rateResponseSchema.safeParse(await response.json())
      if (!result.success) {
        throw new DomainError(
          "CURRENCY_CONVERSION_REQUIRED",
          `Enter the Estimated Cost in ${toCurrency}; the exchange-rate response is invalid.`,
          { cause: result.error },
        )
      }
      return {
        effectiveAt: new Date(`${result.data.date}T00:00:00.000Z`),
        provider: "frankfurter-v2-blended",
        rate: result.data.rate.toFixed(12),
      }
    },
  }
}
