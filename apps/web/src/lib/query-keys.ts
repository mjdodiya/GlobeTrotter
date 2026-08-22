export const queryKeys = {
  all: ["globetrotter"] as const,
  discovery: () => [...queryKeys.all, "discovery"] as const,
  countries: () => [...queryKeys.discovery(), "countries"] as const,
  activityCategories: () => [...queryKeys.discovery(), "activity-categories"] as const,
  publicTrips: () => [...queryKeys.discovery(), "public-trips"] as const,
  publicTripList: () => [...queryKeys.publicTrips(), "list"] as const,
  publicTrip: (tripId: string) => [...queryKeys.publicTrips(), "detail", tripId] as const,
  cities: () => [...queryKeys.discovery(), "cities"] as const,
  cityList: (filters: Readonly<Record<string, unknown>> = {}) =>
    [...queryKeys.cities(), "list", filters] as const,
  city: (cityId: string) => [...queryKeys.cities(), "detail", cityId] as const,
  activities: () => [...queryKeys.discovery(), "activities"] as const,
  activityList: (filters: Readonly<Record<string, unknown>> = {}) =>
    [...queryKeys.activities(), "list", filters] as const,
  activity: (activityId: string) => [...queryKeys.activities(), "detail", activityId] as const,
  savedCities: () => [...queryKeys.all, "me", "saved-cities"] as const,
  session: () => [...queryKeys.all, "session"] as const,
  dashboard: () => [...queryKeys.all, "dashboard"] as const,
  tripLists: () => [...queryKeys.all, "trips", "list"] as const,
  tripList: (filters: Readonly<Record<string, unknown>> = {}) =>
    [...queryKeys.tripLists(), filters] as const,
  trip: (tripId: string) => [...queryKeys.all, "trips", "detail", tripId] as const,
  tripItinerary: (tripId: string) => [...queryKeys.trip(tripId), "itinerary"] as const,
  tripBudget: (tripId: string) => [...queryKeys.trip(tripId), "budget"] as const,
}
