import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppToastProvider } from "@/components/foundation/toast"
import type { Itinerary } from "@/lib/itinerary-api"
import { queryKeys } from "@/lib/query-keys"
import type { Trip } from "@/lib/trip-api"
import { captureTripEtag } from "@/lib/trip-etag"

import { TravelLegWorkspace } from "./travel-leg-workspace"

const tripId = "00000000-0000-4000-8000-000000000009"
const tokyoStopId = "00000000-0000-4000-8000-000000000091"
const losAngelesStopId = "00000000-0000-4000-8000-000000000092"
const legId = "00000000-0000-4000-8000-000000000099"

function trip(level: "owner" | "viewer" = "owner", version = 1): Trip {
  const owner = level === "owner"
  return {
    id: tripId,
    name: "Across the date line",
    description: null,
    coverImageKey: null,
    startDate: "2027-04-01",
    endDate: "2027-04-10",
    budgetLimit: null,
    estimatedCost: "300.0000",
    baseCurrency: "USD",
    visibility: "private",
    destinationCount: 2,
    status: "upcoming",
    version,
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

function itinerary(version = 1): Itinerary {
  return {
    tripId,
    version,
    stops: [
      {
        id: tokyoStopId,
        position: 1_000,
        startDate: "2027-04-01",
        endDate: "2027-04-04",
        city: { id: "91", name: "Tokyo", countryCode: "JP", timezone: "Asia/Tokyo" },
        notes: null,
        items: [],
      },
      {
        id: losAngelesStopId,
        position: 2_000,
        startDate: "2027-04-05",
        endDate: "2027-04-10",
        city: {
          id: "92",
          name: "Los Angeles",
          countryCode: "US",
          timezone: "America/Los_Angeles",
        },
        notes: null,
        items: [],
      },
    ],
    legs: [
      {
        id: legId,
        fromStopId: tokyoStopId,
        toStopId: losAngelesStopId,
        mode: "flight",
        title: "Pacific crossing",
        provider: "Globe Air",
        reference: "GT9",
        departureAt: "2027-04-02T01:30:00.000Z",
        arrivalAt: "2027-04-02T16:00:00.000Z",
        departureTimezone: "Asia/Tokyo",
        arrivalTimezone: "America/Los_Angeles",
        estimatedCost: "300.0000",
        originalCost: null,
        originalCurrency: null,
        exchangeRate: null,
        exchangeRateProvider: null,
        exchangeRateAt: null,
        notes: "Window seat",
      },
    ],
    warnings: [],
  }
}

function jsonResponse(body: unknown, options?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
}

function renderWorkspace(level: "owner" | "viewer" = "owner") {
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
  render(
    <QueryClientProvider client={queryClient}>
      <AppToastProvider>
        <TravelLegWorkspace itinerary={itinerary()} trip={currentTrip} />
      </AppToastProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe("Travel Leg workspace", () => {
  it("renders both stored endpoint zones and preserves them in the edit form", async () => {
    renderWorkspace()

    expect(screen.getByText(/Asia\/Tokyo/)).toBeVisible()
    expect(screen.getByText(/America\/Los_Angeles/)).toBeVisible()
    expect(screen.getByText(/Globe Air.*GT9/)).toBeVisible()
    expect(screen.getByText(/300\.00/)).toBeVisible()
    expect(screen.getByText("Window seat")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Edit Pacific crossing" }))

    expect(await screen.findByRole("dialog", { name: "Edit Pacific crossing" })).toBeVisible()
    expect(screen.getByLabelText("Departure date and time")).toHaveValue("2027-04-02T10:30")
    expect(screen.getByLabelText("Arrival date and time")).toHaveValue("2027-04-02T09:00")
  })

  it("prevents a same-Stop Travel Leg before calling the backend", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Edit Pacific crossing" }))
    await userEvent.selectOptions(screen.getByLabelText("Arrival Stop"), tokyoStopId)
    await userEvent.click(screen.getByRole("button", { name: "Save Travel Leg" }))

    expect(await screen.findByText(/two different Stops/i)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("retains the form and explains a backend rejection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          type: "TRAVEL_LEG_TIME_CONFLICT",
          title: "Travel Leg time conflict",
          status: 422,
          detail: "The backend rejected this Travel Leg chronology.",
        },
        { status: 422 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Edit Pacific crossing" }))
    const title = screen.getByLabelText("Travel Leg title")
    await userEvent.clear(title)
    await userEvent.type(title, "Pacific crossing updated")
    await userEvent.click(screen.getByRole("button", { name: "Save Travel Leg" }))

    expect(
      await screen.findByText("The backend rejected this Travel Leg chronology."),
    ).toBeVisible()
    expect(screen.getByRole("dialog", { name: "Edit Pacific crossing" })).toBeVisible()
    expect(title).toHaveValue("Pacific crossing updated")
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const request = new Request(fetchMock.mock.calls[0]![0], fetchMock.mock.calls[0]![1])
    expect(request.method).toBe("PATCH")
    expect(request.headers.get("If-Match")).toBe('"1"')
    expect(await request.json()).toMatchObject({
      title: "Pacific crossing updated",
      departureAt: "2027-04-02T01:30:00.000Z",
      arrivalAt: "2027-04-02T16:00:00.000Z",
    })
  })

  it("creates a Travel Leg with the complete versioned payload", async () => {
    const createdLeg = { ...itinerary().legs[0]!, id: "00000000-0000-4000-8000-000000000098" }
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { data: { ...createdLeg, version: 2 } },
          { status: 201, headers: { ETag: '"2"' } },
        ),
      )
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Add Travel Leg" }))
    expect(await screen.findByRole("dialog", { name: "Add a Travel Leg" })).toBeVisible()
    await userEvent.type(screen.getByLabelText("Travel Leg title"), "Evening flight")
    await userEvent.type(screen.getByLabelText("Departure date and time"), "2027-04-03T10:30")
    await userEvent.type(screen.getByLabelText("Arrival date and time"), "2027-04-03T09:00")
    await userEvent.type(screen.getByLabelText("Provider"), "Globe Air")
    await userEvent.type(screen.getByLabelText("Booking reference"), "CREATE9")
    await userEvent.clear(screen.getByLabelText("Estimated cost (USD)"))
    await userEvent.type(screen.getByLabelText("Estimated cost (USD)"), "325.5000")
    await userEvent.type(screen.getByLabelText("Private notes"), "Aisle seat")
    await userEvent.click(screen.getByRole("button", { name: "Add Travel Leg" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const request = new Request(fetchMock.mock.calls[0]![0], fetchMock.mock.calls[0]![1])
    expect(request.method).toBe("POST")
    expect(request.headers.get("If-Match")).toBe('"1"')
    expect(await request.json()).toEqual({
      fromStopId: tokyoStopId,
      toStopId: losAngelesStopId,
      mode: "flight",
      title: "Evening flight",
      provider: "Globe Air",
      reference: "CREATE9",
      departureAt: "2027-04-03T01:30:00.000Z",
      arrivalAt: "2027-04-03T16:00:00.000Z",
      estimatedCost: "325.5000",
      notes: "Aisle seat",
    })
    expect(screen.queryByRole("dialog", { name: "Add a Travel Leg" })).not.toBeInTheDocument()
  })

  it("requires explicit confirmation before deleting a Travel Leg", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204, headers: { ETag: '"2"' } }))
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Remove Pacific crossing" }))

    expect(screen.getByRole("alertdialog", { name: "Remove Pacific crossing?" })).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Remove Pacific crossing" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const request = new Request(fetchMock.mock.calls[0]![0], fetchMock.mock.calls[0]![1])
    expect(request.method).toBe("DELETE")
    expect(request.headers.get("If-Match")).toBe('"1"')
  })

  it("previews shifted dates and gaps before explicitly removing affected Travel Legs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              affectedLegIds: [legId],
              stops: [
                { id: losAngelesStopId, startDate: "2027-04-01", endDate: "2027-04-06" },
                { id: tokyoStopId, startDate: "2027-04-07", endDate: "2027-04-10" },
              ],
            },
          },
          { headers: { ETag: '"1"' } },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: {
              tripId,
              affectedLegIds: [legId],
              stops: [
                { id: losAngelesStopId, startDate: "2027-04-01", endDate: "2027-04-06" },
                { id: tokyoStopId, startDate: "2027-04-07", endDate: "2027-04-10" },
              ],
              version: 2,
            },
          },
          { headers: { ETag: '"2"' } },
        ),
      )
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Move Tokyo down" }))
    expect(screen.getByRole("status")).toHaveTextContent(/Tokyo moved to position 2/i)
    await userEvent.click(screen.getByRole("button", { name: "Preview route changes" }))

    expect(await screen.findByRole("heading", { name: "Review route consequences" })).toBeVisible()
    const previewRequest = new Request(fetchMock.mock.calls[0]![0], fetchMock.mock.calls[0]![1])
    expect(previewRequest.method).toBe("POST")
    expect(await previewRequest.json()).toEqual({ stopIds: [losAngelesStopId, tokyoStopId] })
    expect(screen.getByRole("listitem", { name: "Los Angeles route preview" })).toHaveTextContent(
      /Los Angeles.*Apr 5, 2027.*Apr 1, 2027/i,
    )
    expect(screen.getByText(/1-day Planning Gap/i)).toBeVisible()

    const commit = screen.getByRole("button", { name: "Commit route order" })
    expect(commit).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: /Remove Pacific crossing/i }))
    expect(commit).toBeEnabled()
    await userEvent.click(commit)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const commitRequest = new Request(fetchMock.mock.calls[1]![0], fetchMock.mock.calls[1]![1])
    expect(commitRequest.method).toBe("PUT")
    expect(commitRequest.headers.get("If-Match")).toBe('"1"')
    expect(await commitRequest.json()).toEqual({
      stopIds: [losAngelesStopId, tokyoStopId],
      removeLegIds: [legId],
    })
  })

  it("reloads a stale route and requires a new preview before retrying", async () => {
    const previewBody = {
      data: {
        affectedLegIds: [legId],
        stops: [
          { id: losAngelesStopId, startDate: "2027-04-01", endDate: "2027-04-06" },
          { id: tokyoStopId, startDate: "2027-04-07", endDate: "2027-04-10" },
        ],
      },
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(previewBody, { headers: { ETag: '"1"' } }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            type: "STALE_TRIP_VERSION",
            title: "Trip version is stale",
            status: 412,
            detail: "The route changed after this preview.",
          },
          { status: 412 },
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ data: trip("owner", 2) }, { headers: { ETag: '"2"' } }))
      .mockResolvedValueOnce(jsonResponse({ data: itinerary(2) }, { headers: { ETag: '"2"' } }))
      .mockResolvedValueOnce(jsonResponse(previewBody, { headers: { ETag: '"2"' } }))
      .mockResolvedValueOnce(
        jsonResponse(
          { data: { ...previewBody.data, tripId, version: 3 } },
          { headers: { ETag: '"3"' } },
        ),
      )
    vi.stubGlobal("fetch", fetchMock)
    renderWorkspace()

    await userEvent.click(screen.getByRole("button", { name: "Move Tokyo down" }))
    await userEvent.click(screen.getByRole("button", { name: "Preview route changes" }))
    await userEvent.click(await screen.findByRole("checkbox", { name: /Remove Pacific crossing/i }))
    await userEvent.click(screen.getByRole("button", { name: "Commit route order" }))

    expect(await screen.findByRole("heading", { name: "Route preview is stale" })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Reload latest route" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4))
    expect(
      screen.queryByRole("heading", { name: "Review route consequences" }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/create a new preview/i)

    await userEvent.click(screen.getByRole("button", { name: "Move Tokyo down" }))
    await userEvent.click(screen.getByRole("button", { name: "Preview route changes" }))
    await userEvent.click(await screen.findByRole("checkbox", { name: /Remove Pacific crossing/i }))
    await userEvent.click(screen.getByRole("button", { name: "Commit route order" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6))
    const retryRequest = new Request(fetchMock.mock.calls[5]![0], fetchMock.mock.calls[5]![1])
    expect(retryRequest.method).toBe("PUT")
    expect(retryRequest.headers.get("If-Match")).toBe('"2"')
  })
})
