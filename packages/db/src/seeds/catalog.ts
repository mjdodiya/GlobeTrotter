import { activityCategories, activities, cities, closeDatabase, countries, db } from "../index.ts"

const catalogDate = "2026-08-22"

const places = [
  ["FR", "France", "Paris", "Europe/Paris", 48.8566, 2.3522, "EUR", 1],
  ["JP", "Japan", "Tokyo", "Asia/Tokyo", 35.6762, 139.6503, "JPY", 150],
  ["JP", "Japan", "Kyoto", "Asia/Tokyo", 35.0116, 135.7681, "JPY", 145],
  ["GB", "United Kingdom", "London", "Europe/London", 51.5072, -0.1276, "GBP", 0.85],
  ["IT", "Italy", "Rome", "Europe/Rome", 41.9028, 12.4964, "EUR", 1],
  ["ES", "Spain", "Barcelona", "Europe/Madrid", 41.3874, 2.1686, "EUR", 1],
  ["US", "United States", "New York", "America/New_York", 40.7128, -74.006, "USD", 1.1],
  ["US", "United States", "San Francisco", "America/Los_Angeles", 37.7749, -122.4194, "USD", 1.15],
  ["MX", "Mexico", "Mexico City", "America/Mexico_City", 19.4326, -99.1332, "MXN", 17],
  ["BR", "Brazil", "Rio de Janeiro", "America/Sao_Paulo", -22.9068, -43.1729, "BRL", 5.2],
  ["ZA", "South Africa", "Cape Town", "Africa/Johannesburg", -33.9249, 18.4241, "ZAR", 18],
  ["MA", "Morocco", "Marrakech", "Africa/Casablanca", 31.6295, -7.9811, "MAD", 10],
  ["TR", "Türkiye", "Istanbul", "Europe/Istanbul", 41.0082, 28.9784, "TRY", 33],
  ["AE", "United Arab Emirates", "Dubai", "Asia/Dubai", 25.2048, 55.2708, "AED", 3.67],
  ["IN", "India", "Mumbai", "Asia/Kolkata", 19.076, 72.8777, "INR", 83],
  ["TH", "Thailand", "Bangkok", "Asia/Bangkok", 13.7563, 100.5018, "THB", 35],
  ["SG", "Singapore", "Singapore", "Asia/Singapore", 1.3521, 103.8198, "SGD", 1.35],
  ["AU", "Australia", "Sydney", "Australia/Sydney", -33.8688, 151.2093, "AUD", 1.55],
  ["IS", "Iceland", "Reykjavik", "Atlantic/Reykjavik", 64.1466, -21.9426, "ISK", 140],
  ["NL", "Netherlands", "Amsterdam", "Europe/Amsterdam", 52.3676, 4.9041, "EUR", 1],
] as const

const activityTemplates = [
  ["Landmarks walking tour", "Sightseeing", 180, 24],
  ["Local food tasting", "Food", 150, 48],
  ["Urban adventure", "Adventure", 180, 58],
  ["Signature museum visit", "Museum", 120, 22],
  ["Gardens and nature escape", "Nature", 150, 16],
  ["Artisan market visit", "Shopping", 120, 12],
  ["Evening cultural performance", "Entertainment", 150, 42],
  ["Neighborhood discovery walk", "Sightseeing", 120, 18],
] as const

async function seedCatalog() {
  await db
    .insert(countries)
    .values([...new Map(places.map(([code, country]) => [code, { code, name: country }])).values()])
    .onConflictDoNothing()

  const categories = await db.select().from(activityCategories)
  const categoryByName = new Map(categories.map((category) => [category.name, category.id]))

  for (const [countryCode, , name, timezone, latitude, longitude, currency, priceScale] of places) {
    // Keep each city's dependent activities on the same deterministic sequence.
    // oxlint-disable-next-line no-await-in-loop
    const [city] = await db
      .insert(cities)
      .values({
        countryCode,
        name,
        timezone,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        costIndex: (70 + Math.min(priceScale, 30)).toFixed(2),
        description: `${name} is a curated GlobeTrotter destination with planning estimates dated ${catalogDate}.`,
      })
      .onConflictDoUpdate({
        target: [cities.countryCode, cities.name],
        set: { timezone },
      })
      .returning({ id: cities.id })
    if (!city) throw new Error(`Could not seed ${name}`)

    for (const [label, categoryName, duration, basePrice] of activityTemplates) {
      const categoryId = categoryByName.get(categoryName)
      if (!categoryId) throw new Error(`Missing activity category ${categoryName}`)
      // Avoid an unbounded connection burst when reseeding the complete catalog.
      // oxlint-disable-next-line no-await-in-loop
      await db
        .insert(activities)
        .values({
          cityId: city.id,
          categoryId,
          name: `${name} ${label}`,
          description: `A curated ${categoryName.toLowerCase()} idea for a trip to ${name}. Cost is an indicative ${catalogDate} planning estimate.`,
          defaultDurationMinutes: duration,
          estimatedCost: (basePrice * priceScale).toFixed(4),
          currency,
        })
        .onConflictDoUpdate({
          target: [activities.cityId, activities.name],
          set: {
            categoryId,
            defaultDurationMinutes: duration,
            estimatedCost: (basePrice * priceScale).toFixed(4),
            currency,
            updatedAt: new Date(),
          },
        })
    }
  }
}

try {
  await seedCatalog()
} finally {
  await closeDatabase()
}
