import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authClient } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import { createAppRouter } from "@/router"

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    sendVerificationEmail: vi.fn(),
    signIn: { email: vi.fn() },
    signOut: vi.fn(),
    signUp: { email: vi.fn() },
  },
}))

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
    emailVerified: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
} satisfies AppSession

async function renderRoute(path: string, cachedSession: AppSession | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(queryKeys.session(), cachedSession)
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

beforeEach(() => vi.clearAllMocks())

describe("authentication routes", () => {
  it("restores a safe intended route after sign-in and establishes its session", async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null } as never)
    const verifiedSession = { ...session, user: { ...session.user, emailVerified: true } }
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: verifiedSession,
      error: null,
    } as never)
    const { history, queryClient } = await renderRoute(
      "/sign-in?redirect=%2Ftrips%3Fscope%3Dmember%23latest",
    )

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "asha@example.com")
    await userEvent.type(screen.getByLabelText("Password"), "correct-password")
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password?redirect=%2Ftrips%3Fscope%3Dmember%23latest",
    )
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(history.location.pathname).toBe("/trips"))
    expect(history.location.search).toBe("?scope=member")
    expect(history.location.hash).toBe("#latest")
    expect(queryClient.getQueryData(queryKeys.session())).toEqual(verifiedSession)
  })

  it("refreshes cached verification state on the success callback", async () => {
    const verifiedSession = { ...session, user: { ...session.user, emailVerified: true } }
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: verifiedSession,
      error: null,
    } as never)
    const { queryClient } = await renderRoute(
      "/verify-email?verified=true&redirect=%2Fdashboard",
      session,
    )

    expect(screen.getByRole("heading", { name: "Email verified" })).toBeVisible()
    await waitFor(() =>
      expect(queryClient.getQueryData<AppSession>(queryKeys.session())?.user.emailVerified).toBe(
        true,
      ),
    )
  })

  it("clears a cached session after password reset", async () => {
    vi.mocked(authClient.resetPassword).mockResolvedValue({
      data: { status: true },
      error: null,
    } as never)
    const { queryClient } = await renderRoute(
      "/reset-password?token=valid-token&redirect=%2Ftrips",
      session,
    )

    await userEvent.type(screen.getByLabelText("New password"), "new-password")
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password")
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }))

    expect(await screen.findByText("Your password has been reset")).toBeVisible()
    expect(screen.getByRole("link", { name: "Continue to sign in" })).toHaveAttribute(
      "href",
      "/sign-in?redirect=%2Ftrips",
    )
    expect(queryClient.getQueryData(queryKeys.session())).toBeNull()
  })

  it("renders verification failure recovery without exposing the server error code", async () => {
    await renderRoute("/verify-email?error=INVALID_TOKEN&email=asha%40example.com")

    expect(screen.getByRole("heading", { name: "Verification link failed" })).toBeVisible()
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("asha@example.com")
    expect(screen.queryByText("INVALID_TOKEN")).not.toBeInTheDocument()
  })
})
