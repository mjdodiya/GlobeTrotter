import { queryOptions, type QueryClient } from "@tanstack/react-query"

import { authClient } from "./auth-client"
import { queryKeys } from "./query-keys"

type SessionResult = Awaited<ReturnType<typeof authClient.getSession>>
export type AppSession = NonNullable<SessionResult["data"]>

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.session(),
    queryFn: async () => {
      const result = await authClient.getSession()
      if (result.error) throw new Error(result.error.message ?? "Unable to check your session.")
      return result.data ?? null
    },
    staleTime: 60_000,
  })

export async function establishSession(queryClient: QueryClient): Promise<AppSession> {
  queryClient.removeQueries({ queryKey: queryKeys.all })
  const session = await queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 })
  if (!session) throw new Error("Your session could not be started. Please try again.")
  return session
}

export async function refreshSession(queryClient: QueryClient): Promise<AppSession | null> {
  return queryClient.fetchQuery({ ...sessionQueryOptions(), staleTime: 0 })
}

export function expireSession(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: queryKeys.all })
  queryClient.setQueryData(queryKeys.session(), null)
}

export async function clearSession(queryClient: QueryClient): Promise<void> {
  const result = await authClient.signOut()
  if (result.error && result.error.status !== 401) {
    throw new Error(result.error.message ?? "We couldn’t sign you out. Try again.")
  }
  expireSession(queryClient)
}
