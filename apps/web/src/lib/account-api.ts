import { infiniteQueryOptions, queryOptions, type QueryClient } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import { requireResponseData } from "./http"
import { queryKeys } from "./query-keys"

type GetProfile = (typeof apiClient.api.v1.me)["$get"]
type GetSavedCities = (typeof apiClient.api.v1.me)["saved-cities"]["$get"]
type GetDeletionImpact = (typeof apiClient.api.v1.me)["deletion-impact"]["$get"]

export type AccountProfile = InferResponseType<GetProfile, 200>["data"]
export type SavedCity = InferResponseType<GetSavedCities, 200>["data"][number]
export type DeletionImpact = InferResponseType<GetDeletionImpact, 200>["data"]

type CursorPage<T> = { data: T[]; meta: { nextCursor: string | null } }

async function requireCursorPage<T>(response: Response): Promise<CursorPage<T>> {
  if (!response.ok) await requireResponseData<never>(response)
  return (await response.json()) as CursorPage<T>
}

export const accountProfileQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.profile(),
    queryFn: async () => {
      const response = await apiClient.api.v1.me.$get()
      return requireResponseData<AccountProfile>(response)
    },
  })

export const savedCitiesQueryOptions = (limit = 6) =>
  infiniteQueryOptions({
    queryKey: queryKeys.savedCityPages(),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.me["saved-cities"].$get({
        query: { limit: String(limit), ...(pageParam ? { cursor: pageParam } : {}) },
      })
      return requireCursorPage<SavedCity>(response)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })

export const deletionImpactQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.deletionImpact(),
    queryFn: async () => {
      const response = await apiClient.api.v1.me["deletion-impact"].$get()
      return requireResponseData<DeletionImpact>(response)
    },
  })

export async function updateAccountProfile(
  input: Pick<AccountProfile, "defaultCurrency" | "locale" | "name">,
): Promise<AccountProfile> {
  const response = await apiClient.api.v1.me.$patch({ json: input })
  return requireResponseData<AccountProfile>(response)
}

export async function removeSavedCity(cityId: string): Promise<void> {
  const response = await apiClient.api.v1.me["saved-cities"][":cityId"].$delete({
    param: { cityId },
  })
  if (!response.ok) await requireResponseData<never>(response)
}

export async function invalidateAccountDefaults(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.profile() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() }),
  ])
}

export function filenameFromContentDisposition(value: string | null, fallback: string): string {
  if (!value) return fallback
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value)?.[1]
  if (encoded) {
    try {
      return decodeURIComponent(encoded).replaceAll(/[\\/]/g, "_")
    } catch {
      return fallback
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i.exec(value)
  return (plain?.[1] ?? plain?.[2]?.trim() ?? fallback).replaceAll(/[\\/]/g, "_")
}

async function saveDownload(response: Response, fallbackFilename: string): Promise<void> {
  if (!response.ok) await requireResponseData<never>(response)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = objectUrl
  link.download = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFilename,
  )
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

export async function downloadAccountData(kind: "calendar" | "export"): Promise<void> {
  if (kind === "export") {
    const response = await apiClient.api.v1.me.export.$get()
    await saveDownload(response, "globetrotter-export.json")
    return
  }
  const response = await apiClient.api.v1.me["calendar.ics"].$get()
  await saveDownload(response, "globetrotter-calendar.ics")
}
