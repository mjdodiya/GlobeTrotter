import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { createAppRouter } from "@/router"

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } })
}

function testQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  queryClient.setQueryData(queryKeys.session(), null)
  return queryClient
}

async function renderRoute(path: string, queryClient = testQueryClient()) {
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

describe("discovery routes", () => {
  it("does not request City results per keystroke and submits filters to the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [],
        meta: { nextCursor: null },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.countries(), [])
    const { history } = await renderRoute("/cities", queryClient)
    await screen.findByRole("heading", { name: "Find your next city" })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await userEvent.type(screen.getByRole("searchbox", { name: "City name" }), "Kyoto")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole("button", { name: "Search" }))
    await waitFor(() => expect(history.location.search).toBe("?q=Kyoto"))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it("prompts a signed-out visitor to sign in and return before saving", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: {
            id: "7",
            name: "Kyoto",
            country: { code: "JP", name: "Japan" },
            region: "Kansai",
            timezone: "Asia/Tokyo",
            latitude: "35.011600",
            longitude: "135.768100",
            costIndex: "82.00",
            description: null,
            imageUrl: null,
          },
        }),
      ),
    )
    await renderRoute("/cities/7")

    const saveLink = await screen.findByRole("link", { name: "Sign in to save Kyoto" })
    expect(saveLink).toHaveAttribute("href", "/sign-in?redirect=%2Fcities%2F7")
  })

  it("saves a City for an authenticated traveler", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            id: "7",
            name: "Kyoto",
            country: { code: "JP", name: "Japan" },
            region: "Kansai",
            timezone: "Asia/Tokyo",
            latitude: "35.011600",
            longitude: "135.768100",
            costIndex: "82.00",
            description: null,
            imageUrl: null,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { cityId: "7", saved: true } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.session(), {
      user: { id: "user-1", name: "Asha", email: "asha@example.com", image: null },
    })
    queryClient.setQueryData(queryKeys.savedCities(), [])
    await renderRoute("/cities/7", queryClient)

    await userEvent.click(await screen.findByRole("button", { name: "Save Kyoto" }))
    await screen.findByRole("button", { name: "Remove Kyoto from saved cities" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const request = fetchMock.mock.calls[1]![0]
    const requestOptions = fetchMock.mock.calls[1]![1] as RequestInit
    expect(String(request)).toContain("/api/v1/me/saved-cities/7")
    expect(requestOptions.method).toBe("PUT")

    await userEvent.click(screen.getByRole("button", { name: "Remove Kyoto from saved cities" }))
    await screen.findByRole("button", { name: "Save Kyoto" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect((fetchMock.mock.calls[2]![1] as RequestInit).method).toBe("DELETE")
  })
})
