import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "./query-keys"
import { useVersionedTripMutation } from "./trip-api"
import { captureTripEtag } from "./trip-etag"

const tripId = "00000000-0000-4000-8000-000000000001"

function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
}

function wrapper(queryClient: QueryClient) {
  return function TestQueryProvider({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function versionedResponse(etag: string) {
  return new Response(JSON.stringify({ data: { id: tripId, name: "Latest Trip" } }), {
    headers: { "Content-Type": "application/json", ETag: etag },
  })
}

function staleResponse() {
  return new Response(
    JSON.stringify({
      type: "STALE_TRIP_VERSION",
      title: "Trip version is stale",
      status: 412,
      detail: "Refresh the Trip before retrying.",
    }),
    { status: 412, headers: { "Content-Type": "application/problem+json" } },
  )
}

afterEach(() => vi.unstubAllGlobals())

describe("versioned Trip mutations", () => {
  it("rolls the cached Trip ETag forward after a successful mutation", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.trip(tripId), {
      data: { id: tripId, name: "Cached Trip" },
      etag: captureTripEtag('"1"'),
    })
    const request = vi.fn().mockResolvedValue(versionedResponse('"2"'))
    const { result } = renderHook(() => useVersionedTripMutation({ tripId, request }), {
      wrapper: wrapper(queryClient),
    })

    await act(() => result.current.mutation.mutateAsync({ name: "Renamed Trip" }))

    expect(request).toHaveBeenCalledWith({ name: "Renamed Trip" }, { "If-Match": '"1"' })
    expect(queryClient.getQueryData(queryKeys.trip(tripId))).toMatchObject({ etag: '"2"' })
  })

  it("refreshes after a 412 and retries the retained input with the latest ETag", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.trip(tripId), {
      data: { id: tripId, name: "Cached Trip" },
      etag: captureTripEtag('"1"'),
    })
    const request = vi
      .fn()
      .mockResolvedValueOnce(staleResponse())
      .mockResolvedValueOnce(versionedResponse('"3"'))
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(versionedResponse('"2"')))
    const { result } = renderHook(() => useVersionedTripMutation({ tripId, request }), {
      wrapper: wrapper(queryClient),
    })

    act(() => result.current.mutation.mutate({ name: "Retained edit" }))
    await waitFor(() => expect(result.current.recovery?.problem.kind).toBe("stale-trip"))

    await act(() => result.current.recovery?.onRefresh())
    act(() => result.current.recovery?.onRetry())

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(request).toHaveBeenNthCalledWith(2, { name: "Retained edit" }, { "If-Match": '"2"' })
    await waitFor(() =>
      expect(queryClient.getQueryData(queryKeys.trip(tripId))).toMatchObject({ etag: '"3"' }),
    )
  })

  it("offers 428 recovery before sending a mutation without a cached ETag", async () => {
    const queryClient = testQueryClient()
    const request = vi.fn().mockResolvedValue(versionedResponse('"2"'))
    const { result } = renderHook(() => useVersionedTripMutation({ tripId, request }), {
      wrapper: wrapper(queryClient),
    })

    act(() => result.current.mutation.mutate({ name: "Blocked edit" }))

    await waitFor(() => expect(result.current.recovery?.problem.status).toBe(428))
    expect(result.current.recovery?.problem.kind).toBe("precondition")
    expect(request).not.toHaveBeenCalled()
  })
})
