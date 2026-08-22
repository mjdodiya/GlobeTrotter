export const queryKeys = {
  all: ["globetrotter"] as const,
  session: () => [...queryKeys.all, "session"] as const,
  dashboard: () => [...queryKeys.all, "dashboard"] as const,
  tripLists: () => [...queryKeys.all, "trips", "list"] as const,
  tripList: (filters: Readonly<Record<string, unknown>> = {}) =>
    [...queryKeys.tripLists(), filters] as const,
  trip: (tripId: string) => [...queryKeys.all, "trips", "detail", tripId] as const,
  tripItinerary: (tripId: string) => [...queryKeys.trip(tripId), "itinerary"] as const,
  tripBudget: (tripId: string) => [...queryKeys.trip(tripId), "budget"] as const,
}
