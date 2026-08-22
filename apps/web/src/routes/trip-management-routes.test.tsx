import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import { createAppRouter } from "@/router"

const tripId = "00000000-0000-4000-8000-000000000007"

const session = {
  session: {
    id: "session-7",
    userId: "user-7",
    token: "secret",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  user: {
    id: "user-7",
    name: "Asha Traveler",
    email: "asha@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies AppSession

function jsonResponse(body: unknown, options?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
}

function access(level: "editor" | "owner" | "viewer") {
  const owner = level === "owner"
  return {
    level,
    canEdit: owner || level === "editor",
    canManageMembers: owner,
    canManageShareLinks: owner,
    canDelete: owner,
  }
}

function tripDetail(level: "editor" | "owner" | "viewer", version = 1) {
  return {
    id: tripId,
    name: "Kyoto spring",
    description: "Temples, gardens, and long walks.",
    coverImageKey: null,
    startDate: "2027-04-01",
    endDate: "2027-04-08",
    budgetLimit: "2000.0000",
    estimatedCost: "750.0000",
    baseCurrency: "USD",
    visibility: "private",
    destinationCount: 2,
    status: "upcoming",
    version,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    access: access(level),
  }
}

function testQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  queryClient.setQueryData(queryKeys.session(), session)
  return queryClient
}

async function renderRoute(path: string) {
  const queryClient = testQueryClient()
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter({ history, queryClient })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { history, queryClient }
}

afterEach(() => vi.unstubAllGlobals())

describe("Trip management routes", () => {
  it("keeps list filters linkable and renders access and Trip Status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              id: tripId,
              name: "Shared Kyoto",
              startDate: "2026-08-20",
              endDate: "2026-08-28",
              destinationCount: 1,
              estimatedCost: "500.0000",
              budgetLimit: null,
              baseCurrency: "USD",
              status: "ongoing",
              visibility: "private",
              version: 1,
              updatedAt: "2026-08-20T00:00:00.000Z",
              access: access("viewer"),
            },
          ],
          meta: { nextCursor: null },
        }),
      ),
    )
    const { history } = await renderRoute("/trips?scope=member&status=ongoing")

    expect(await screen.findByRole("heading", { name: "My Trips" })).toBeVisible()
    expect(screen.getByLabelText("Access filter")).toHaveValue("member")
    expect(screen.getByLabelText("Trip Status filter")).toHaveValue("ongoing")
    expect(await screen.findByText("Member · Viewer")).toBeVisible()
    expect(screen.getAllByText("Ongoing")).toHaveLength(2)

    await userEvent.selectOptions(screen.getByLabelText("Trip Status filter"), "completed")
    await waitFor(() => {
      const search = new URLSearchParams(history.location.search)
      expect(search.get("scope")).toBe("member")
      expect(search.get("status")).toBe("completed")
    })
  })

  it("shows each dashboard currency as a separate budget highlight", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            upcomingTrips: [],
            recentTrips: [],
            popularCities: [],
            budgetHighlights: {
              currencies: [
                {
                  currency: "INR",
                  tripCount: 2,
                  totalBudget: "100000.0000",
                  totalEstimatedCost: "45000.0000",
                },
                {
                  currency: "USD",
                  tripCount: 1,
                  totalBudget: "3000.0000",
                  totalEstimatedCost: "1200.0000",
                },
              ],
            },
          },
        }),
      ),
    )
    await renderRoute("/dashboard")

    expect(await screen.findByRole("heading", { name: "Budget highlights" })).toBeVisible()
    expect(screen.getByText("INR")).toBeVisible()
    expect(screen.getByText("USD")).toBeVisible()
    expect(screen.getByText(/never combined across currencies/i)).toBeVisible()
  })

  it("gates owner-only controls from a viewer", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ data: tripDetail("viewer") }, { headers: { ETag: '"1"' } }),
        ),
    )
    await renderRoute(`/trips/${tripId}/manage`)

    expect(await screen.findByRole("heading", { name: "Kyoto spring" })).toBeVisible()
    expect(screen.getByText("Member · Viewer")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Read-only Member Trip" })).toBeVisible()
    expect(screen.queryByRole("heading", { name: "Edit Trip details" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Delete Trip" })).not.toBeInTheDocument()
  })

  it("sends If-Match and recovers an owner edit from a stale version", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: tripDetail("owner") }, { headers: { ETag: '"1"' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            type: "STALE_TRIP_VERSION",
            title: "Trip version is stale",
            status: 412,
            detail: "Refresh the Trip before retrying.",
          },
          { status: 412 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: tripDetail("owner", 2) }, { headers: { ETag: '"2"' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: tripDetail("owner", 3) }, { headers: { ETag: '"3"' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: tripDetail("owner", 3) }, { headers: { ETag: '"3"' } }),
      )
    vi.stubGlobal("fetch", fetchMock)
    await renderRoute(`/trips/${tripId}/manage`)

    const deleteTrigger = await screen.findByRole("button", { name: "Delete Trip" })
    await userEvent.click(deleteTrigger)
    expect(screen.getByRole("alertdialog", { name: "Delete Kyoto spring?" })).toHaveTextContent(
      /Stops, itinerary items, Travel Legs, memberships, and Share Links.*cannot be undone/i,
    )
    expect(screen.getByRole("button", { name: "Delete Kyoto spring" })).toBeVisible()
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(
      await screen.findByRole("alertdialog", { name: "Review the latest Trip before retrying" }),
    ).toBeVisible()

    const staleRequest = new Request(fetchMock.mock.calls[1]![0], fetchMock.mock.calls[1]![1])
    expect(staleRequest.method).toBe("PATCH")
    expect(staleRequest.headers.get("If-Match")).toBe('"1"')

    await userEvent.click(screen.getByRole("button", { name: "Review latest Trip" }))
    expect(await screen.findByRole("heading", { name: "Review the refreshed Trip" })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: "Retry my changes" }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5))
    const retryRequest = new Request(fetchMock.mock.calls[3]![0], fetchMock.mock.calls[3]![1])
    expect(retryRequest.headers.get("If-Match")).toBe('"2"')
    expect(await screen.findByText("Trip updated")).toBeVisible()
  })
})
