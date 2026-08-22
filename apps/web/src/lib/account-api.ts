import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import { requireResponseData } from "./http"
import { queryKeys } from "./query-keys"

type GetMe = typeof apiClient.api.v1.me.$get
type GetSavedCities = (typeof apiClient.api.v1.me)["saved-cities"]["$get"]
type GetDeletionImpact = (typeof apiClient.api.v1.me)["deletion-impact"]["$get"]

export type AccountProfile = InferResponseType<GetMe, 200>["data"]
export type SavedCity = InferResponseType<GetSavedCities, 200>["data"][number]
export type DeletionImpact = InferResponseType<GetDeletionImpact, 200>["data"]

export const accountQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.all, "me"] as const,
    queryFn: async () => requireResponseData<AccountProfile>(await apiClient.api.v1.me.$get()),
  })

export const savedCitiesQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: queryKeys.savedCities(),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.me["saved-cities"].$get({
        query: { limit: "12", ...(pageParam ? { cursor: pageParam } : {}) },
      })
      if (!response.ok) await requireResponseData<never>(response)
      return (await response.json()) as InferResponseType<GetSavedCities, 200>
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })

export const deletionImpactQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.all, "me", "deletion-impact"] as const,
    queryFn: async () =>
      requireResponseData<DeletionImpact>(await apiClient.api.v1.me["deletion-impact"].$get()),
  })

export async function updateAccount(input: {
  name?: string
  locale?: string
  defaultCurrency?: string
}) {
  return requireResponseData<AccountProfile>(await apiClient.api.v1.me.$patch({ json: input }))
}

export async function removeSavedCity(cityId: string) {
  const response = await apiClient.api.v1.me["saved-cities"][":cityId"].$delete({
    param: { cityId },
  })
  if (!response.ok) await requireResponseData<never>(response)
}

async function download(response: Response, fallbackFilename: string) {
  if (!response.ok) await requireResponseData<never>(response)
  const disposition = response.headers.get("content-disposition")
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallbackFilename
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

export function downloadAccountExport() {
  return apiClient.api.v1.me["export"]
    .$get()
    .then((response) => download(response, "globetrotter-export.json"))
}

export function downloadAccountCalendar() {
  return apiClient.api.v1.me["calendar.ics"]
    .$get()
    .then((response) => download(response, "globetrotter-calendar.ics"))
}
