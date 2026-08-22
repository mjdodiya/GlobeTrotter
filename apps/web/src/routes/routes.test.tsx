import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import { createAppRouter } from "@/router"

function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderRoute(path: string, session?: AppSession | null) {
  const queryClient = testQueryClient()
  if (session !== undefined) queryClient.setQueryData(queryKeys.session(), session)
  const history = createMemoryHistory({ initialEntries: [path] })
  const router = createAppRouter({ history, queryClient })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { history, router }
}

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

describe("application routes", () => {
  it("renders the public shell without a session", async () => {
    await renderRoute("/", null)

    expect(
      screen.getByRole("heading", {
        name: "Travel plans that stay clear from first idea to final day.",
      }),
    ).toBeVisible()
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible()
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    )
  })

  it("keeps the public shell around a not-found route", async () => {
    await renderRoute("/missing-page", null)

    expect(screen.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible()
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible()
  })

  it("redirects a protected route to sign-in while preserving its intended destination", async () => {
    const { history } = await renderRoute("/trips?scope=member#latest", null)

    expect(await screen.findByRole("heading", { name: "Sign in to GlobeTrotter" })).toBeVisible()
    expect(history.location.search).toContain("redirect=%2Ftrips%3Fscope%3Dmember%23latest")
  })

  it("renders authenticated navigation and an operable account menu", async () => {
    await renderRoute("/dashboard", session)

    expect(screen.getByRole("navigation", { name: "Workspace" })).toBeVisible()
    const mobileMenu = screen.getByRole("button", { name: "Open navigation" })
    await userEvent.click(mobileMenu)
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    expect(mobileMenu).toHaveFocus()

    await userEvent.click(screen.getByRole("button", { name: "Open account menu" }))
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeVisible()
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("link", { name: "My Trips" }))
    const heading = await screen.findByRole("heading", { name: "My Trips" })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})
