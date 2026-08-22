import { queryOptions } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import { requireVersionedResponseData } from "./http"
import { queryKeys } from "./query-keys"
import type { VersionedTripRequest } from "./trip-api"

type GetItinerary = (typeof apiClient.api.v1.trips)[":tripId"]["itinerary"]["$get"]
type ItineraryResponse = InferResponseType<GetItinerary, 200>["data"]
type ItineraryStopResponse = ItineraryResponse["stops"][number]
type ItineraryItemResponse = ItineraryStopResponse["items"][number]

export type ItineraryItem = Omit<ItineraryItemResponse, "sourceActivityId"> & {
  sourceActivityId: string | null
}
export type ItineraryStop = Omit<ItineraryStopResponse, "city" | "items"> & {
  city: Omit<ItineraryStopResponse["city"], "id"> & { id: string }
  items: ItineraryItem[]
}
export type Itinerary = Omit<ItineraryResponse, "stops"> & { stops: ItineraryStop[] }

export type ItemKind = ItineraryItem["kind"]

export type CreateStopInput = {
  cityId: string
  endDate: string
  insertAfterStopId?: string | null
  notes?: string | null
  startDate: string
}

export type UpdateStopInput = Partial<
  Pick<CreateStopInput, "cityId" | "endDate" | "notes" | "startDate">
>

type CommonCreateItemInput = {
  durationMinutes?: number | null
  insertAfterItemId?: string | null
  notes?: string | null
  scheduledDate: string
  startTime?: string | null
}

export type CreateCatalogItemInput = CommonCreateItemInput & {
  estimatedCost?: string
  sourceActivityId: string
}

export type CreateCustomItemInput = CommonCreateItemInput & {
  description?: string | null
  endDate?: string
  endTime?: string | null
  estimatedCost: string
  kind: ItemKind
  title: string
}

export type CreateItemInput = CreateCatalogItemInput | CreateCustomItemInput

export type UpdateItemInput = Partial<{
  description: string | null
  durationMinutes: number | null
  endDate: string | null
  endTime: string | null
  estimatedCost: string
  kind: ItemKind
  notes: string | null
  scheduledDate: string
  startTime: string | null
  title: string
}>

async function getItinerary(tripId: string) {
  const response = await apiClient.api.v1.trips[":tripId"].itinerary.$get({
    param: { tripId },
  })
  return requireVersionedResponseData<Itinerary>(response)
}

export function itineraryQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.tripItinerary(tripId),
    queryFn: () => getItinerary(tripId),
  })
}

export function createStopRequest(tripId: string): VersionedTripRequest<CreateStopInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops.$post({ json: input, param: { tripId } } as never, {
      headers,
    })
}

export function updateStopRequest(
  tripId: string,
  stopId: string,
): VersionedTripRequest<UpdateStopInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].$patch(
      { json: input, param: { stopId, tripId } } as never,
      { headers },
    )
}

export function deleteStopRequest(tripId: string, stopId: string): VersionedTripRequest<void> {
  return (_input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].$delete(
      { param: { stopId, tripId } },
      { headers },
    )
}

export function createItemRequest(
  tripId: string,
  stopId: string,
): VersionedTripRequest<CreateItemInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].items.$post(
      { json: input, param: { stopId, tripId } } as never,
      { headers },
    )
}

export function updateItemRequest(
  tripId: string,
  stopId: string,
  itemId: string,
): VersionedTripRequest<UpdateItemInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].items[":itemId"].$patch(
      { json: input, param: { itemId, stopId, tripId } } as never,
      { headers },
    )
}

export function deleteItemRequest(
  tripId: string,
  stopId: string,
  itemId: string,
): VersionedTripRequest<void> {
  return (_input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].items[":itemId"].$delete(
      { param: { itemId, stopId, tripId } },
      { headers },
    )
}

export function reorderItemsRequest(
  tripId: string,
  stopId: string,
): VersionedTripRequest<{ itemIds: string[] }> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].stops[":stopId"].items.order.$put(
      { json: input, param: { stopId, tripId } } as never,
      { headers },
    )
}
