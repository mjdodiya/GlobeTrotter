import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppToastProvider } from "@/components/foundation/toast"
import { itineraryQueryOptions, type Itinerary } from "@/lib/itinerary-api"
import { queryKeys } from "@/lib/query-keys"
import type { Trip } from "@/lib/trip-api"
import { captureTripEtag } from "@/lib/trip-etag"

import { ItineraryWorkspace } from "./itinerary-workspace"

const tripId = "00000000-0000-4000-8000-000000000008"
const stopId = "00000000-0000-4000-8000-000000000081"
const firstItemId = "00000000-0000-4000-8000-000000000811"
const secondItemId = "00000000-0000-4000-8000-000000000812"

function trip(level: "owner" | "viewer"): Trip {
  const owner = level === "owner"
  return {
    id: tripId,
    name: "Kyoto spring",
    description: null,
    coverImageKey: null,
    startDate: "2027-04-01",
    endDate: "2027-04-08",
    budgetLimit: "2000.0000",
    estimatedCost: "500.0000",
    baseCurrency: "USD",
    visibility: "private",
    destinationCount: 1,
    status: "upcoming",
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    access: {
      level,
      canEdit: owner,
      canManageMembers: owner,
      canManageShareLinks: owner,
      canDelete: owner,
    },
  }
}

function item(
  id: string,
  title: string,
  overrides: Partial<Itinerary["stops"][number]["items"][number]> = {},
): Itinerary["stops"][number]["items"][number] {
  return {
    id,
    sourceActivityId: null,
    kind: "activity",
    title,
    description: null,
    scheduledDate: "2027-04-02",
    startTime: "10:00:00",
    endDate: null,
    endTime: null,
    durationMinutes: 60,
    estimatedCost: "50.0000",
    originalCost: null,
    originalCurrency: null,
    exchangeRate: null,
    exchangeRateProvider: null,
    exchangeRateAt: null,
    position: 1_000,
    notes: null,
    ...overrides,
  }
}

function itinerary(version = 1, itemOrder = [firstItemId, secondItemId]): Itinerary {
  const itemsById = new Map([
    [firstItemId, item(firstItemId, "Temple visit")],
    [
      secondItemId,
      item(secondItemId, "Riverside Hotel", {
        kind: "stay",
        scheduledDate: "2027-04-02",
        startTime: "15:00:00",
        endDate: "2027-04-05",
        endTime: "10:00:00",
        durationMinutes: null,
        estimatedCost: "400.0000",
        position: 2_000,
      }),
    ],
  ])
  return {
    tripId,
    version,
    stops: [
      {
        id: stopId,
        position: 1_000,
        startDate: "2027-04-02",
        endDate: "2027-04-05",
        city: {
          id: "21",
          name: "Kyoto",
          countryCode: "JP",
          timezone: "Asia/Tokyo",
        },
        notes: "Walkable neighborhoods",
        items: itemOrder.map((id) => itemsById.get(id)!),
      },
    ],
    legs: [],
    warnings: [
      {
        code: "ACCOMMODATION_GAP",
        message: "One or more nights in this stop do not have a Stay.",
        stopIds: [stopId],
      },
    ],
  }
}

function jsonResponse(body: unknown, options?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
}

function renderWorkspace(level: "owner" | "viewer") {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  const currentTrip = trip(level)
  queryClient.setQueryData(queryKeys.trip(tripId), {
    data: currentTrip,
    etag: captureTripEtag('"1"'),
  })
  queryClient.setQueryData(itineraryQueryOptions(tripId).queryKey, {
    data: itinerary(),
    etag: captureTripEtag('"1"'),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <AppToastProvider>
        <ItineraryWorkspace trip={currentTrip} />
      </AppToastProvider>
    </QueryClientProvider>,
  )
  return queryClient
}

afterEach(() => vi.unstubAllGlobals())

describe("Itinerary workspace", () => {
  it("keeps viewer mode read-only while showing the complete planning content", () => {
    renderWorkspace("viewer")

    expect(screen.getByText("Read-only itinerary")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Kyoto, JP" })).toBeVisible()
    expect(screen.getByText("Temple visit")).toBeVisible()
    expect(screen.getByText("Riverside Hotel")).toBeVisible()
    expect(screen.queryByRole("button", { name: "Add Stop" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Edit Stop" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Move Temple visit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remove Temple visit/ })).not.toBeInTheDocument()
  })

  it("sends the complete reordered item permutation with the current Trip ETag", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        if (request.method === "PUT") {
          return jsonResponse(
            { data: { tripId, stopId, version: 2 } },
            { headers: { ETag: '"2"' } },
          )
        }
        return jsonResponse(
          { data: itinerary(2, [secondItemId, firstItemId]) },
          { headers: { ETag: '"2"' } },
        )
      })
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace("owner")

    await userEvent.click(screen.getByRole("button", { name: "Move Temple visit down" }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input, init]) => new Request(input, init).method === "PUT"),
      ).toBe(true),
    )
    const reorderCall = fetchMock.mock.calls.find(
      ([input, init]) => new Request(input, init).method === "PUT",
    )!
    const request = new Request(reorderCall[0], reorderCall[1])
    expect(request.headers.get("If-Match")).toBe('"1"')
    expect(await request.json()).toEqual({ itemIds: [secondItemId, firstItemId] })
  })

  it("shows Stay check-in and checkout as one span with the allowed end boundary", async () => {
    renderWorkspace("owner")

    await userEvent.click(screen.getByRole("button", { name: "Edit Riverside Hotel" }))

    expect(await screen.findByRole("dialog", { name: "Edit Riverside Hotel" })).toBeVisible()
    expect(screen.getByLabelText("Check-in date")).toHaveAttribute("max", "2027-04-04")
    expect(screen.getByLabelText("Checkout date")).toHaveAttribute("max", "2027-04-05")
    expect(
      screen.getByText(/Checkout may be on 2027-04-05.*excluded Stop departure date/i),
    ).toBeVisible()
    expect(screen.getByLabelText("Check-in time")).toHaveValue("15:00")
    expect(screen.getByLabelText("Checkout time")).toHaveValue("10:00")
  })
})
