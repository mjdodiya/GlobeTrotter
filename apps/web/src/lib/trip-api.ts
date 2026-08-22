import {
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"
import { useState } from "react"

import { apiClient } from "./api"
import {
  ApiProblemError,
  requireResponseData,
  requireVersionedMutationResponse,
  requireVersionedResponseData,
} from "./http"
import { normalizeProblemDetails, type ProblemDetails } from "./problem-details"
import { queryKeys } from "./query-keys"
import { ifMatchHeaders, MissingTripEtagError, type TripEtag } from "./trip-etag"

type GetTrip = (typeof apiClient.api.v1.trips)[":tripId"]["$get"]
type GetDashboard = typeof apiClient.api.v1.dashboard.$get
type GetTrips = typeof apiClient.api.v1.trips.$get
type PostTrip = typeof apiClient.api.v1.trips.$post

type TripResponse = InferResponseType<GetTrip, 200>
export type Trip = TripResponse["data"]
export type Dashboard = InferResponseType<GetDashboard, 200>["data"]
export type TripSummary = InferResponseType<GetTrips, 200>["data"][number]
export type CreatedTrip = InferResponseType<PostTrip, 201>["data"]
export type CreateTripInput = {
  baseCurrency: string
  budgetLimit?: string | null
  description?: string | null
  endDate: string
  name: string
  startDate: string
  visibility?: "private" | "public"
}
export type UpdateTripInput = {
  baseCurrency?: string
  budgetLimit?: string | null
  coverImageKey?: string | null
  description?: string | null
  endDate?: string
  name?: string
  startDate?: string
  visibility?: "private" | "public"
}
export type TripListFilters = {
  scope?: "all" | "member" | "owned"
  status?: "completed" | "ongoing" | "upcoming"
}
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

type TripPage = {
  data: TripSummary[]
  meta: { nextCursor: string | null }
}

async function requireTripPage(response: Response): Promise<TripPage> {
  if (!response.ok) await requireResponseData<never>(response)
  return (await response.json()) as TripPage
}

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.dashboard(),
    queryFn: async () => {
      const response = await apiClient.api.v1.dashboard.$get()
      return requireResponseData<Dashboard>(response)
    },
  })
}

export function tripListQueryOptions(filters: TripListFilters) {
  return infiniteQueryOptions({
    queryKey: queryKeys.tripList(filters),
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.api.v1.trips.$get({
        query: {
          limit: "12",
          ...(filters.scope && filters.scope !== "all" ? { scope: filters.scope } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      })
      return requireTripPage(response)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.meta.nextCursor ?? undefined,
  })
}

export async function createTrip(
  input: CreateTripInput,
): Promise<{ data: CreatedTrip; etag: TripEtag }> {
  // Route bodies are parsed directly by Hono, so AppType does not expose their JSON shape.
  const response = await apiClient.api.v1.trips.$post({ json: input } as never)
  return requireVersionedResponseData<CreatedTrip>(response)
}

export function updateTripRequest(tripId: string): VersionedTripRequest<UpdateTripInput> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].$patch({ json: input, param: { tripId } } as never, {
      headers,
    })
}

export function deleteTripRequest(tripId: string): VersionedTripRequest<void> {
  return (_input, headers) =>
    apiClient.api.v1.trips[":tripId"].$delete({ param: { tripId } }, { headers })
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
  onSuccess?: (result: { data: TOutput; etag: TripEtag }) => Promise<void> | void
  request: VersionedTripRequest<TInput>
  removeTripOnSuccess?: boolean
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
      if (options.removeTripOnSuccess) {
        queryClient.removeQueries({ exact: true, queryKey: queryKeys.trip(options.tripId) })
        await Promise.all([
          queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.dashboard() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.tripLists() }),
        ])
        await options.onSuccess?.(result)
        return
      }
      queryClient.setQueryData<VersionedTrip>(queryKeys.trip(options.tripId), (trip) =>
        trip ? { ...trip, etag: result.etag } : trip,
      )
      await invalidateTripQueries(queryClient, options.tripId)
      await options.onSuccess?.(result)
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
