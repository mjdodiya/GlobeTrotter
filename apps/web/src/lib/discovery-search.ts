export type CitySearch = {
  countryCode?: string
  q?: string
  region?: string
}

export type ActivitySearch = {
  categoryId?: string
  cityId?: string
  currency?: string
  maxCost?: string
  maxDurationMinutes?: string
  q?: string
}

function text(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized && normalized.length <= maximumLength ? normalized : undefined
}

function positiveInteger(value: unknown): string | undefined {
  const normalized = text(value, 30)
  if (!normalized || !/^\d+$/.test(normalized) || Number(normalized) <= 0) return undefined
  return String(Number(normalized))
}

function positiveMoney(value: unknown): string | undefined {
  const normalized = text(value, 30)
  if (!normalized || !/^\d+(?:\.\d{1,4})?$/.test(normalized) || Number(normalized) < 0) {
    return undefined
  }
  return normalized
}

export function validateCitySearch(search: Record<string, unknown>): CitySearch {
  const q = text(search.q, 100)
  const region = text(search.region, 200)
  const countryCode = text(search.countryCode, 2)?.toUpperCase()

  return {
    ...(q ? { q } : {}),
    ...(region ? { region } : {}),
    ...(countryCode && /^[A-Z]{2}$/.test(countryCode) ? { countryCode } : {}),
  }
}

export function validateActivitySearch(search: Record<string, unknown>): ActivitySearch {
  const q = text(search.q, 100)
  const cityId = positiveInteger(search.cityId)
  const categoryId = positiveInteger(search.categoryId)
  const maxDurationMinutes = positiveInteger(search.maxDurationMinutes)
  const maxCost = positiveMoney(search.maxCost)
  const currency = text(search.currency, 3)?.toUpperCase()
  const validCurrency = currency && /^[A-Z]{3}$/.test(currency) ? currency : undefined

  return {
    ...(q ? { q } : {}),
    ...(cityId ? { cityId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(maxDurationMinutes ? { maxDurationMinutes } : {}),
    ...(maxCost && validCurrency ? { maxCost, currency: validCurrency } : {}),
  }
}

export function uniqueById<T extends { id: string }>(
  pages: readonly { data: readonly T[] }[],
): T[] {
  const items = new Map<string, T>()
  for (const page of pages) {
    for (const item of page.data) items.set(item.id, item)
  }
  return [...items.values()]
}
