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

export async function clearSession(queryClient: QueryClient): Promise<void> {
  await authClient.signOut()
  queryClient.setQueryData(queryKeys.session(), null)
  await queryClient.invalidateQueries({ queryKey: queryKeys.all })
}
