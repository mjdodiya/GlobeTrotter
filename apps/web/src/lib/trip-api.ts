import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import { requireVersionedMutationResponse, requireVersionedResponseData } from "./http"
import { queryKeys } from "./query-keys"
import { ifMatchHeaders, MissingTripEtagError, type TripEtag } from "./trip-etag"

type GetTrip = (typeof apiClient.api.v1.trips)[":tripId"]["$get"]

type TripResponse = InferResponseType<GetTrip, 200>
export type Trip = TripResponse["data"]
export type VersionedTrip = { data: Trip; etag: TripEtag }
export type VersionedTripRequest<TInput> = (
  input: TInput,
  headers: ReturnType<typeof ifMatchHeaders>,
) => Promise<Response>

async function getTrip(tripId: string): Promise<VersionedTrip> {
  const response = await apiClient.api.v1.trips[":tripId"].$get({ param: { tripId } })
  return requireVersionedResponseData<Trip>(response)
}

export function tripQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => getTrip(tripId),
  })
}

export async function invalidateTripQueries(
  queryClient: QueryClient,
  tripId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.dashboard() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tripLists() }),
    queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.trip(tripId) }),
    queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.tripItinerary(tripId) }),
    queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.tripBudget(tripId) }),
  ])
}

export function versionedTripMutationOptions<TInput, TOutput>(options: {
  queryClient: QueryClient
  request: VersionedTripRequest<TInput>
  tripId: string
}) {
  return mutationOptions({
    mutationFn: async (input: TInput) => {
      const trip = options.queryClient.getQueryData<VersionedTrip>(queryKeys.trip(options.tripId))
      if (!trip) throw new MissingTripEtagError()

      const response = await options.request(input, ifMatchHeaders(trip.etag))
      return requireVersionedMutationResponse<TOutput>(response)
    },
    onSuccess: () => invalidateTripQueries(options.queryClient, options.tripId),
  })
}

export async function refreshTrip(
  queryClient: QueryClient,
  tripId: string,
): Promise<VersionedTrip> {
  return queryClient.fetchQuery({ ...tripQueryOptions(tripId), staleTime: 0 })
}
