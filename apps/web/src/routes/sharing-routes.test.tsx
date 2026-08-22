import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import { createAppRouter } from "@/router"

const sourceTripId = "00000000-0000-4000-8000-000000000012"
const copiedTripId = "00000000-0000-4000-8000-000000000013"
const memberId = "member-12"
const shareLinkId = "00000000-0000-4000-8000-000000000014"
const shareToken = "private-share-token-abcdefghijklmnopqrstuvwxyz0123456789"

const session = {
  session: {
    id: "session-12",
    userId: "owner-12",
    token: "session-secret",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  user: {
    id: "owner-12",
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

function queryClientWithSession(currentSession: AppSession | null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  queryClient.setQueryData(queryKeys.session(), currentSession)
  return queryClient
}

async function renderRoute(path: string, currentSession: AppSession | null) {
  const queryClient = queryClientWithSession(currentSession)
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

function sharedTrip() {
  return {
    id: sourceTripId,
    name: "Shared Kyoto",
    description: "A privacy-safe itinerary.",
    startDate: "2027-04-01",
    endDate: "2027-04-08",
    estimatedCost: "750.0000",
    baseCurrency: "USD",
    destinationCount: 1,
    status: "upcoming",
    version: 1,
    coverImageUrl: null,
    owner: { id: "owner-12", name: "Asha Traveler", imageUrl: null },
    stops: [
      {
        id: "stop-12",
        position: 0,
        startDate: "2027-04-01",
        endDate: "2027-04-08",
        city: { id: "7", name: "Kyoto", countryCode: "JP", timezone: "Asia/Tokyo" },
        notes: "PRIVATE STOP NOTE",
        items: [
          {
            id: "item-12",
            sourceActivityId: null,
            kind: "activity",
            title: "Tea ceremony",
            description: "An afternoon ceremony.",
            scheduledDate: "2027-04-02",
            startTime: "14:00:00",
            endDate: null,
            endTime: null,
            durationMinutes: 90,
            estimatedCost: "40.0000",
            originalCost: null,
            originalCurrency: null,
            exchangeRate: null,
            exchangeRateProvider: null,
            exchangeRateAt: null,
            position: 0,
            notes: "PRIVATE ITEM NOTE",
          },
        ],
      },
    ],
    legs: [],
    warnings: [],
    budgetLimit: "PRIVATE BUDGET LIMIT",
  }
}

function participantTrip(version = 1) {
  return {
    id: sourceTripId,
    name: "Shared Kyoto",
    description: "A participant Trip.",
    coverImageKey: null,
    startDate: "2027-04-01",
    endDate: "2027-04-08",
    budgetLimit: "2000.0000",
    estimatedCost: "750.0000",
    baseCurrency: "USD",
    visibility: "private",
    destinationCount: 1,
    status: "upcoming",
    version,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    access: {
      level: "owner",
      canEdit: true,
      canManageMembers: true,
      canManageShareLinks: true,
      canDelete: true,
    },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("sharing routes", () => {
  it("renders only the privacy-safe link projection and keeps the token out of client storage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: sharedTrip() }, { headers: { ETag: '"1"' } })),
    )
    const { queryClient } = await renderRoute(`/share/${shareToken}`, null)

    expect(await screen.findByRole("heading", { name: "Shared Kyoto" })).toBeVisible()
    expect(screen.getByText("Tea ceremony")).toBeVisible()
    expect(screen.queryByText("PRIVATE BUDGET LIMIT")).not.toBeInTheDocument()
    expect(screen.queryByText("PRIVATE STOP NOTE")).not.toBeInTheDocument()
    expect(screen.queryByText("PRIVATE ITEM NOTE")).not.toBeInTheDocument()
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey),
      ),
    ).not.toContain(shareToken)
    expect(document.title).not.toContain(shareToken)
    expect(JSON.stringify(localStorage)).not.toContain(shareToken)
  })

  it("uses one deliberate unavailable state for expired, revoked, and unknown Share Links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            type: "TRIP_NOT_FOUND",
            title: "Not found",
            status: 404,
            detail: "The link-shared trip is not available.",
          },
          { status: 404 },
        ),
      ),
    )
    await renderRoute(`/share/${shareToken}`, null)

    expect(
      await screen.findByRole("heading", { name: "This shared Trip is unavailable" }),
    ).toBeVisible()
    expect(screen.getByText(/expired, revoked, or incorrect/i)).toBeVisible()
    expect(screen.queryByText(/does not exist/i)).not.toBeInTheDocument()
  })

  it("copies a link-shared Trip and navigates to its independent private copy", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      if (
        request.method === "POST" &&
        request.url.endsWith(`/link-shared-trips/${shareToken}/copy`)
      ) {
        return Promise.resolve(
          jsonResponse({ data: { id: copiedTripId, version: 1 } }, { status: 201 }),
        )
      }
      return Promise.resolve(jsonResponse({ data: sharedTrip() }, { headers: { ETag: '"1"' } }))
    })
    vi.stubGlobal("fetch", fetchMock)
    const { history } = await renderRoute(`/share/${shareToken}`, session)

    await userEvent.click(await screen.findByRole("button", { name: "Copy this Trip" }))
    await waitFor(() => expect(history.location.pathname).toBe(`/trips/${copiedTripId}/manage`))

    const copyRequest = fetchMock.mock.calls
      .map(([input, init]) => new Request(input, init))
      .find((request) => request.method === "POST")
    expect(copyRequest?.url).toContain(`/link-shared-trips/${shareToken}/copy`)
  })

  it("copies a public Trip through the authenticated Trip Copy endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      if (request.method === "POST" && request.url.endsWith(`/trips/${sourceTripId}/copy`)) {
        return Promise.resolve(
          jsonResponse({ data: { id: copiedTripId, version: 1 } }, { status: 201 }),
        )
      }
      return Promise.resolve(jsonResponse({ data: sharedTrip() }, { headers: { ETag: '"1"' } }))
    })
    vi.stubGlobal("fetch", fetchMock)
    const { history } = await renderRoute(`/trips/${sourceTripId}`, session)

    await userEvent.click(await screen.findByRole("button", { name: "Copy this Trip" }))
    await waitFor(() => expect(history.location.pathname).toBe(`/trips/${copiedTripId}/manage`))

    expect(
      fetchMock.mock.calls
        .map(([input, init]) => new Request(input, init))
        .some(
          (request) =>
            request.method === "POST" && request.url.endsWith(`/trips/${sourceTripId}/copy`),
        ),
    ).toBe(true)
  })

  it("adds a verified member and provides a keyboard clipboard fallback for a new Share Link", async () => {
    let version = 1
    const members = [
      {
        user: { id: memberId, name: "Mira Editor", imageUrl: null },
        role: "editor",
        createdAt: "2026-08-20T00:00:00.000Z",
      },
    ]
    const links: Array<{
      id: string
      createdAt: string
      expiresAt: string | null
      revokedAt: string | null
    }> = []
    const createdUrl = `https://globetrotter.test/share/${shareToken}`
    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/itinerary")) {
          return jsonResponse(
            { data: { tripId: sourceTripId, version, stops: [], legs: [], warnings: [] } },
            { headers: { ETag: `"${version}"` } },
          )
        }
        if (request.url.endsWith("/members")) {
          if (request.method === "POST") {
            version += 1
            return jsonResponse(
              { data: { ...members[0], version } },
              { status: 201, headers: { ETag: `"${version}"` } },
            )
          }
          return jsonResponse({ data: members }, { headers: { ETag: `"${version}"` } })
        }
        if (request.url.endsWith("/share-links")) {
          if (request.method === "POST") {
            version += 1
            links.push({
              id: shareLinkId,
              createdAt: "2026-08-22T12:00:00.000Z",
              expiresAt: null,
              revokedAt: null,
            })
            return jsonResponse(
              { data: { id: shareLinkId, url: createdUrl, expiresAt: null, version } },
              { status: 201, headers: { ETag: `"${version}"` } },
            )
          }
          return jsonResponse({ data: links }, { headers: { ETag: `"${version}"` } })
        }
        return jsonResponse(
          { data: participantTrip(version) },
          { headers: { ETag: `"${version}"` } },
        )
      })
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    await renderRoute(`/trips/${sourceTripId}/manage`, session)

    await userEvent.type(await screen.findByLabelText("Verified account email"), "mira@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Add member" }))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls
          .map(([input, init]) => new Request(input, init))
          .some((request) => request.method === "POST" && request.url.endsWith("/members")),
      ).toBe(true),
    )
    const memberRequest = fetchMock.mock.calls
      .map(([input, init]) => new Request(input, init))
      .find((request) => request.method === "POST" && request.url.endsWith("/members"))
    expect(memberRequest?.headers.get("If-Match")).toBe('"1"')
    expect(await memberRequest?.json()).toEqual({ email: "mira@example.com", role: "viewer" })

    await userEvent.click(screen.getByRole("button", { name: "Create Share Link" }))
    expect(await screen.findByLabelText("New Share Link")).toHaveValue(createdUrl)
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }))
    expect(await screen.findByText(/selected.*Ctrl\+C or Command\+C/i)).toBeVisible()
    expect(screen.getByLabelText("New Share Link")).toHaveFocus()
  })
})
