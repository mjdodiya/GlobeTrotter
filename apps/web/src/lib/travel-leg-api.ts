import { apiClient } from "./api"
import { requireVersionedResponseData } from "./http"
import type { Itinerary } from "./itinerary-api"
import type { TravelLegMode } from "./travel-leg-rules"
import type { VersionedTripRequest } from "./trip-api"
import { ifMatchHeaders, type TripEtag } from "./trip-etag"

export type TravelLeg = Itinerary["legs"][number]

export type TravelLegInput = {
  arrivalAt: string
  departureAt: string
  estimatedCost: string
  fromStopId: string
  mode: TravelLegMode
  notes?: string | null
  provider?: string | null
  reference?: string | null
  title: string
  toStopId: string
}

export type StopOrderPreview = {
  affectedLegIds: string[]
  stops: Array<{ endDate: string; id: string; startDate: string }>
}

export type ReorderStopsInput = {
  removeLegIds: string[]
  stopIds: string[]
}

export type PreviewedReorderStopsInput = ReorderStopsInput & { previewEtag: TripEtag }

export function createTravelLegRequest(tripId: string): VersionedTripRequest<TravelLegInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].legs.$post({ json: input, param: { tripId } } as never, {
      headers,
    })
}

export function updateTravelLegRequest(
  tripId: string,
  legId: string,
): VersionedTripRequest<TravelLegInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].legs[":legId"].$patch(
      { json: input, param: { legId, tripId } } as never,
      { headers },
    )
}

export function deleteTravelLegRequest(tripId: string, legId: string): VersionedTripRequest<void> {
  return (_input, headers) =>
    apiClient.api.v1.trips[":tripId"].legs[":legId"].$delete(
      { param: { legId, tripId } },
      { headers },
    )
}

export async function previewStopOrder(
  tripId: string,
  stopIds: string[],
): Promise<{ data: StopOrderPreview; etag: TripEtag }> {
  const response = await apiClient.api.v1.trips[":tripId"].stops.order.preview.$post({
    json: { stopIds },
    param: { tripId },
  } as never)
  return requireVersionedResponseData<StopOrderPreview>(response)
}

export function reorderStopsFromPreviewRequest(
  tripId: string,
): VersionedTripRequest<PreviewedReorderStopsInput> {
  return ({ previewEtag, ...input }, _headers) =>
    apiClient.api.v1.trips[":tripId"].stops.order.$put(
      { json: input, param: { tripId } } as never,
      { headers: ifMatchHeaders(previewEtag) },
    )
}
