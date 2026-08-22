import { DomainError } from "../errors/domain-error.ts"

type CurrencyConversion = {
  amount: string
  currency: string
  effectiveAt: string
  provider: string
  rate: string
  targetCurrency: string
}

function scaledDecimal(value: string, scale: number): bigint {
  const match = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/.exec(value)
  if (!match || (match[1]?.length ?? 0) > scale) {
    throw new DomainError("VALIDATION_ERROR", "Currency conversion contains an invalid decimal.")
  }
  const [whole] = value.split(".")
  return BigInt(whole!) * 10n ** BigInt(scale) + BigInt((match[1] ?? "").padEnd(scale, "0") || "0")
}

function formatScaled(value: bigint, scale: number): string {
  const divisor = 10n ** BigInt(scale)
  return `${value / divisor}.${String(value % divisor).padStart(scale, "0")}`
}

export function snapshotCurrencyConversion(input: CurrencyConversion) {
  if (input.currency === input.targetCurrency) {
    throw new DomainError("VALIDATION_ERROR", "A conversion requires two different currencies.")
  }
  const original = scaledDecimal(input.amount, 4)
  const rate = scaledDecimal(input.rate, 12)
  const rateScale = 10n ** 12n
  const product = original * rate
  const converted = (product + rateScale / 2n) / rateScale

  return {
    estimatedCost: formatScaled(converted, 4),
    exchangeRate: formatScaled(rate, 12),
    exchangeRateAt: input.effectiveAt,
    exchangeRateProvider: input.provider,
    originalCost: formatScaled(original, 4),
    originalCurrency: input.currency,
  }
}
