import { DomainError } from "../errors/domain-error.ts"

type EstimatedCostEntry = {
  amount: string
  endDate?: string
  id: string
  kind: "item" | "stay" | "travel-leg"
  startDate: string
}

type DailyEstimatedCost = {
  date: string
  estimatedCost: string
}

const scale = 10_000n
const millisecondsPerDay = 86_400_000

function parseMoney(value: string): bigint {
  const match = /^(?:0|[1-9]\d*)(?:\.(\d{1,4}))?$/.exec(value)
  if (!match) throw new DomainError("VALIDATION_ERROR", "Estimated Cost is invalid.")
  const whole = BigInt(value.split(".")[0]!)
  const fraction = BigInt((match[1] ?? "").padEnd(4, "0") || "0")
  return whole * scale + fraction
}

function formatMoney(value: bigint): string {
  return `${value / scale}.${String(value % scale).padStart(4, "0")}`
}

function addDays(value: string, days: number): string {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`) + days * millisecondsPerDay
  return new Date(timestamp).toISOString().slice(0, 10)
}

function daysBetween(later: string, earlier: string): number {
  return (
    (Date.parse(`${later}T00:00:00.000Z`) - Date.parse(`${earlier}T00:00:00.000Z`)) /
    millisecondsPerDay
  )
}

export function allocateEstimatedCosts(entries: readonly EstimatedCostEntry[]): {
  days: DailyEstimatedCost[]
  estimatedTotal: string
} {
  const daily = new Map<string, bigint>()
  let estimatedTotal = 0n

  const add = (date: string, amount: bigint) => {
    daily.set(date, (daily.get(date) ?? 0n) + amount)
  }

  for (const entry of entries) {
    const amount = parseMoney(entry.amount)
    estimatedTotal += amount

    if (entry.kind !== "stay") {
      add(entry.startDate, amount)
      continue
    }

    const nights = entry.endDate ? daysBetween(entry.endDate, entry.startDate) : 0
    if (!Number.isInteger(nights) || nights <= 0) {
      throw new DomainError("VALIDATION_ERROR", "A Stay must contain at least one night.")
    }

    const nightCount = BigInt(nights)
    const perNight = amount / nightCount
    const remainder = amount % nightCount
    // Allocate at fixed four-decimal precision. Any indivisible remainder goes
    // to the earliest nights, guaranteeing daily values sum to the stored total.
    for (let index = 0; index < nights; index += 1) {
      add(addDays(entry.startDate, index), perNight + (BigInt(index) < remainder ? 1n : 0n))
    }
  }

  return {
    estimatedTotal: formatMoney(estimatedTotal),
    days: [...daily.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([date, amount]) => ({ date, estimatedCost: formatMoney(amount) })),
  }
}
