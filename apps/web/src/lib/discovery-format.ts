export function formatDateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  })
  return `${formatter.format(new Date(`${startDate}T00:00:00Z`))} – ${formatter.format(
    new Date(`${endDate}T00:00:00Z`),
  )}`
}

export function formatMoney(amount: string | null, currency: string | null): string {
  if (amount === null || currency === null) return "Cost not provided"
  return new Intl.NumberFormat(undefined, {
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(amount))
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "Flexible duration"
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours} hr`
  return `${hours} hr ${remainingMinutes} min`
}

export function costIndexSummary(costIndex: string | null): string {
  return costIndex === null ? "Cost index unavailable" : `Cost index ${Number(costIndex)}`
}
