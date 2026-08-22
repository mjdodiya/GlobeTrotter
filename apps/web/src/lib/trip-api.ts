import { queryOptions, type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"
import { useState } from "react"

import { apiClient } from "./api"
import {
  ApiProblemError,
  requireVersionedMutationResponse,
  requireVersionedResponseData,
} from "./http"
import { normalizeProblemDetails, type ProblemDetails } from "./problem-details"
import { queryKeys } from "./query-keys"
import { ifMatchHeaders, MissingTripEtagError, type TripEtag } from "./trip-etag"

type GetTrip = (typeof apiClient.api.v1.trips)[":tripId"]["$get"]
type GetItinerary = (typeof apiClient.api.v1.trips)[":tripId"]["itinerary"]["$get"]

type TripResponse = InferResponseType<GetTrip, 200>
type ItineraryResponse = InferResponseType<GetItinerary, 200>
export type Trip = TripResponse["data"]
export type TripItinerary = ItineraryResponse["data"]
export type VersionedTrip = { data: Trip; etag: TripEtag }
export type VersionedTripRequest<TInput> = (
  input: TInput,
  headers: ReturnType<typeof ifMatchHeaders>,
) => Promise<Response>
export type TripMutationRecovery = {
  onCancel: () => void
  onRefresh: () => Promise<void>
  onRetry: () => void
  open: true
  problem: ProblemDetails
}

async function getTrip(tripId: string): Promise<VersionedTrip> {
  const response = await apiClient.api.v1.trips[":tripId"].$get({ param: { tripId } })
  return requireVersionedResponseData<Trip>(response)
}

async function getTripItinerary(tripId: string): Promise<{ data: TripItinerary; etag: TripEtag }> {
  const response = await apiClient.api.v1.trips[":tripId"].itinerary.$get({ param: { tripId } })
  return requireVersionedResponseData<TripItinerary>(response)
}

export function tripQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.trip(tripId),
    queryFn: () => getTrip(tripId),
  })
}

export function tripItineraryQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.tripItinerary(tripId),
    queryFn: () => getTripItinerary(tripId),
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

function recoveryProblem(error: Error): ProblemDetails | undefined {
  if (error instanceof ApiProblemError) {
    return error.problem.kind === "stale-trip" || error.problem.kind === "precondition"
      ? error.problem
      : undefined
  }
  if (error instanceof MissingTripEtagError) {
    return normalizeProblemDetails(
      {
        type: "PRECONDITION_REQUIRED",
        title: "Latest Trip version required",
        status: 428,
        detail: error.message,
      },
      428,
    )
  }
  return undefined
}

export function useVersionedTripMutation<TInput, TOutput>(options: {
  request: VersionedTripRequest<TInput>
  tripId: string
}) {
  const queryClient = useQueryClient()
  const [failedMutation, setFailedMutation] = useState<{
    input: TInput
    problem: ProblemDetails
  }>()
  const mutation = useMutation({
    mutationFn: async (input: TInput) => {
      const trip = queryClient.getQueryData<VersionedTrip>(queryKeys.trip(options.tripId))
      if (!trip) throw new MissingTripEtagError()

      const response = await options.request(input, ifMatchHeaders(trip.etag))
      return requireVersionedMutationResponse<TOutput>(response)
    },
    onError: (error, input) => {
      const problem = recoveryProblem(error)
      if (problem) setFailedMutation({ input, problem })
    },
    onSuccess: async (result) => {
      setFailedMutation(undefined)
      queryClient.setQueryData<VersionedTrip>(queryKeys.trip(options.tripId), (trip) =>
        trip ? { ...trip, etag: result.etag } : trip,
      )
      await invalidateTripQueries(queryClient, options.tripId)
    },
  })

  const recovery: TripMutationRecovery | null = failedMutation
    ? {
        open: true,
        problem: failedMutation.problem,
        onCancel: () => {
          setFailedMutation(undefined)
          mutation.reset()
        },
        onRefresh: async () => {
          await refreshTrip(queryClient, options.tripId)
        },
        onRetry: () => {
          const input = failedMutation.input
          setFailedMutation(undefined)
          mutation.mutate(input)
        },
      }
    : null

  return { mutation, recovery }
}

export async function refreshTrip(
  queryClient: QueryClient,
  tripId: string,
): Promise<VersionedTrip> {
  return queryClient.fetchQuery({ ...tripQueryOptions(tripId), staleTime: 0 })
}
