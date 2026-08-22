import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import { createAppRouter } from "@/router"

const session = {
  session: {
    id: "session-1",
    userId: "user-1",
    token: "secret",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  user: {
    id: "user-1",
    name: "Asha Traveler",
    email: "asha@example.com",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies AppSession

const profile = {
  id: "user-1",
  name: "Asha Traveler",
  email: "asha@example.com",
  emailVerified: true,
  imageUrl: null,
  locale: "en-IN",
  defaultCurrency: "INR",
}

const impact = {
  ownedTrips: 2,
  tripStops: 5,
  itineraryItems: 9,
  travelLegs: 3,
  collaboratorsLosingAccess: 4,
  membershipsRemoved: 1,
  shareLinksRevoked: 2,
  savedCitiesRemoved: 1,
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
}

function accountFetch() {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input)
    if (url.endsWith("/api/v1/me") && init?.method === "PATCH") {
      return jsonResponse({ data: { ...profile, name: "Asha Rao" } })
    }
    if (url.endsWith("/api/v1/me")) return jsonResponse({ data: profile })
    if (url.includes("/api/v1/me/saved-cities")) {
      return jsonResponse({
        data: [
          {
            id: "7",
            name: "Kyoto",
            region: "Kansai",
            timezone: "Asia/Tokyo",
            country: { code: "JP", name: "Japan" },
            costIndex: "82.00",
            imageUrl: null,
            savedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        meta: { nextCursor: null },
      })
    }
    if (url.endsWith("/api/v1/me/deletion-impact")) return jsonResponse({ data: impact })
    throw new Error(`Unexpected request: ${url}`)
  })
}

async function renderAccount(fetchMock = accountFetch(), path = "/account") {
  vi.stubGlobal("fetch", fetchMock)
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  queryClient.setQueryData(queryKeys.session(), session)
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter({ history, queryClient })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { fetchMock, queryClient }
}

afterEach(() => vi.unstubAllGlobals())

describe("account settings route", () => {
  it("shows profile status, Saved Cities, and the complete deletion impact", async () => {
    await renderAccount()

    expect(await screen.findByRole("heading", { name: "Account settings" })).toBeVisible()
    expect(screen.getByText("asha@example.com")).toBeVisible()
    expect(screen.getByText("Verified")).toBeVisible()
    expect(await screen.findByRole("link", { name: "Kyoto" })).toHaveAttribute("href", "/cities/7")
    expect(await screen.findByText("Collaborators losing access")).toBeVisible()
    expect(screen.getByText("Share Links revoked")).toBeVisible()
    expect(screen.getByText("Saved Cities removed")).toBeVisible()
  })

  it("updates profile preferences without changing an existing Trip", async () => {
    const { fetchMock } = await renderAccount()
    const name = await screen.findByRole("textbox", { name: "Name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Asha Rao")
    await userEvent.click(screen.getByRole("button", { name: "Save profile and preferences" }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/me"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    )
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")
    expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
      name: "Asha Rao",
      locale: "en-IN",
      defaultCurrency: "INR",
    })
  })

  it("uses the account default currency for a new Trip", async () => {
    await renderAccount(accountFetch(), "/trips/new")

    expect(await screen.findByRole("textbox", { name: "Base Currency" })).toHaveValue("INR")
  })

  it("requires the signed-in email before exposing permanent deletion confirmation", async () => {
    await renderAccount()
    const button = await screen.findByRole("button", { name: "Delete account permanently" })
    expect(button).toBeDisabled()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Type your email address to continue" }),
      "asha@example.com",
    )
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(
      screen.getByRole("alertdialog", { name: "Permanently delete your account?" }),
    ).toBeVisible()
  })
})
