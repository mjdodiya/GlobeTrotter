import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authClient } from "./auth-client"
import { queryKeys } from "./query-keys"
import {
  clearSession,
  establishSession,
  expireSession,
  refreshSession,
  type AppSession,
} from "./session"

vi.mock("./auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    signOut: vi.fn(),
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

function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

beforeEach(() => vi.clearAllMocks())

describe("session cache transitions", () => {
  it("removes data from a previous identity when sign-in establishes a session", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.dashboard(), { private: "previous user" })
    vi.mocked(authClient.getSession).mockResolvedValue({ data: session, error: null } as never)

    await establishSession(queryClient)

    expect(queryClient.getQueryData(queryKeys.dashboard())).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.session())).toEqual(session)
  })

  it("replaces cached verification state with a fresh session", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.session(), session)
    const verifiedSession = { ...session, user: { ...session.user, emailVerified: true } }
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: verifiedSession,
      error: null,
    } as never)

    await refreshSession(queryClient)

    expect(queryClient.getQueryData<AppSession>(queryKeys.session())?.user.emailVerified).toBe(true)
  })

  it("clears all application data after sign-out", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.session(), session)
    queryClient.setQueryData(queryKeys.trip("trip-1"), { private: true })
    vi.mocked(authClient.signOut).mockResolvedValue({
      data: { success: true },
      error: null,
    } as never)

    await clearSession(queryClient)

    expect(queryClient.getQueryData(queryKeys.session())).toBeNull()
    expect(queryClient.getQueryData(queryKeys.trip("trip-1"))).toBeUndefined()
  })

  it("treats an already-expired server session as signed out", async () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.session(), session)
    vi.mocked(authClient.signOut).mockResolvedValue({
      data: null,
      error: { message: "Session expired", status: 401, statusText: "Unauthorized" },
    } as never)

    await clearSession(queryClient)

    expect(queryClient.getQueryData(queryKeys.session())).toBeNull()
  })

  it("clears cached account data when a session expires or a password reset completes", () => {
    const queryClient = testQueryClient()
    queryClient.setQueryData(queryKeys.session(), session)
    queryClient.setQueryData(queryKeys.dashboard(), { private: true })

    expireSession(queryClient)

    expect(queryClient.getQueryData(queryKeys.session())).toBeNull()
    expect(queryClient.getQueryData(queryKeys.dashboard())).toBeUndefined()
  })
})
