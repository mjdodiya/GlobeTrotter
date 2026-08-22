import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import type { ActivitySearch, CitySearch } from "./discovery-search"
import { requireResponseData } from "./http"
import { queryKeys } from "./query-keys"

type GetCountries = typeof apiClient.api.v1.countries.$get
type GetCities = typeof apiClient.api.v1.cities.$get
type GetActivityCategories = (typeof apiClient.api.v1)["activity-categories"]["$get"]
type GetActivities = typeof apiClient.api.v1.activities.$get
type GetPublicTrips = typeof apiClient.api.v1.public.trips.$get
type GetPublicTrip = (typeof apiClient.api.v1.public.trips)[":tripId"]["$get"]
type GetSavedCities = (typeof apiClient.api.v1.me)["saved-cities"]["$get"]

export type Country = InferResponseType<GetCountries, 200>["data"][number]
type CatalogCityResponse = InferResponseType<GetCities, 200>["data"][number]
type CatalogActivityResponse = InferResponseType<GetActivities, 200>["data"][number]
type ActivityCategoryResponse = InferResponseType<GetActivityCategories, 200>["data"][number]
type PublicTripResponse = InferResponseType<GetPublicTrip, 200>["data"]

// Catalog identifiers are non-null database identities. bigintId also serializes
// nullable foreign keys, so its shared return type is wider than these endpoint contracts.
export type CatalogCity = Omit<CatalogCityResponse, "id"> & { id: string }
export type CatalogActivity = Omit<CatalogActivityResponse, "category" | "city" | "id"> & {
  category: Omit<CatalogActivityResponse["category"], "id"> & { id: string }
  city: Omit<CatalogActivityResponse["city"], "id"> & { id: string }
  id: string
}
export type ActivityCategory = Omit<ActivityCategoryResponse, "id"> & { id: string }
export type PublicTripSummary = InferResponseType<GetPublicTrips, 200>["data"][number]
export type PublicTrip = Omit<PublicTripResponse, "stops"> & {
  stops: Array<
    Omit<PublicTripResponse["stops"][number], "city"> & {
      city: Omit<PublicTripResponse["stops"][number]["city"], "id"> & { id: string }
    }
  >
}

export type CursorPage<T> = {
  data: T[]
  meta: { nextCursor: string | null }
}

async function requireCursorPage<T>(response: Response): Promise<CursorPage<T>> {
  if (!response.ok) await requireResponseData<never>(response)
  return (await response.json()) as CursorPage<T>
}

export const countriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.countries(),
    queryFn: async () => {
      const response = await apiClient.api.v1.countries.$get()
      return requireResponseData<Country[]>(response)
    },
    staleTime: 60 * 60 * 1000,
  })

export const activityCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.activityCategories(),
    queryFn: async () => {
      const response = await apiClient.api.v1["activity-categories"].$get()
      return requireResponseData<ActivityCategory[]>(response)
    },
    staleTime: 60 * 60 * 1000,
  })

export function publicTripsQueryOptions() {
  return infiniteQueryOptions({
    queryKey: queryKeys.publicTripList(),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.public.trips.$get({
        query: { limit: "12", ...(pageParam ? { cursor: pageParam } : {}) },
      })
      return requireCursorPage<PublicTripSummary>(response)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })
}

export function publicTripQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.publicTrip(tripId),
    queryFn: async () => {
      const response = await apiClient.api.v1.public.trips[":tripId"].$get({
        param: { tripId },
      })
      return requireResponseData<PublicTrip>(response)
    },
  })
}

export function citiesQueryOptions(filters: CitySearch, limit = 12) {
  return infiniteQueryOptions({
    queryKey: queryKeys.cityList(filters),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.cities.$get({
        query: {
          limit: String(limit),
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
          ...(filters.region ? { region: filters.region } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      })
      return requireCursorPage<CatalogCity>(response)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })
}

export function cityQueryOptions(cityId: string) {
  return queryOptions({
    queryKey: queryKeys.city(cityId),
    queryFn: async () => {
      const response = await apiClient.api.v1.cities[":cityId"].$get({ param: { cityId } })
      return requireResponseData<CatalogCity>(response)
    },
  })
}

export function activitiesQueryOptions(filters: ActivitySearch) {
  return infiniteQueryOptions({
    queryKey: queryKeys.activityList(filters),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.activities.$get({
        query: {
          limit: "12",
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.cityId ? { cityId: filters.cityId } : {}),
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.maxDurationMinutes ? { maxDurationMinutes: filters.maxDurationMinutes } : {}),
          ...(filters.currency ? { currency: filters.currency } : {}),
          ...(filters.maxCost ? { maxCost: filters.maxCost } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      })
      return requireCursorPage<CatalogActivity>(response)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })
}

export function activityQueryOptions(activityId: string) {
  return queryOptions({
    queryKey: queryKeys.activity(activityId),
    queryFn: async () => {
      const response = await apiClient.api.v1.activities[":activityId"].$get({
        param: { activityId },
      })
      return requireResponseData<CatalogActivity>(response)
    },
  })
}

export const catalogCityOptionsQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.cities(), "options"] as const,
    queryFn: async () => {
      const cityOptions: CatalogCity[] = []
      let cursor: string | undefined
      // oxlint-disable no-await-in-loop -- each response supplies the next opaque cursor.
      do {
        const response = await apiClient.api.v1.cities.$get({
          query: { limit: "100", ...(cursor ? { cursor } : {}) },
        })
        const page = await requireCursorPage<CatalogCity>(response)
        cityOptions.push(...page.data)
        cursor = page.meta.nextCursor ?? undefined
      } while (cursor)
      // oxlint-enable no-await-in-loop
      return cityOptions
    },
    staleTime: 60 * 60 * 1000,
  })

export const savedCityIdsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.savedCities(),
    queryFn: async () => {
      const ids: string[] = []
      let cursor: string | undefined
      // oxlint-disable no-await-in-loop -- each response supplies the next opaque cursor.
      do {
        const response = await apiClient.api.v1.me["saved-cities"].$get({
          query: { limit: "100", ...(cursor ? { cursor } : {}) },
        })
        const page =
          await requireCursorPage<InferResponseType<GetSavedCities, 200>["data"][number]>(response)
        ids.push(...page.data.flatMap((city) => (city.id === null ? [] : [city.id])))
        cursor = page.meta.nextCursor ?? undefined
      } while (cursor)
      // oxlint-enable no-await-in-loop
      return ids
    },
  })

export async function setCitySaved(cityId: string, saved: boolean): Promise<void> {
  if (saved) {
    const response = await apiClient.api.v1.me["saved-cities"][":cityId"].$put({
      param: { cityId },
    })
    await requireResponseData(response)
    return
  }

  const response = await apiClient.api.v1.me["saved-cities"][":cityId"].$delete({
    param: { cityId },
  })
  if (!response.ok) await requireResponseData<never>(response)
}
