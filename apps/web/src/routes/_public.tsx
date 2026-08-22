import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router"

import { PublicShell } from "@/components/foundation/shells"
import { useAppToast } from "@/components/foundation/toast"
import { clearSession, sessionQueryOptions } from "@/lib/session"

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
})

function PublicLayout() {
  const { queryClient } = Route.useRouteContext()
  const sessionQuery = useQuery(sessionQueryOptions())
  const router = useRouter()
  const toast = useAppToast()

  async function signOut() {
    try {
      await clearSession(queryClient)
      await router.navigate({ to: "/" })
    } catch (error) {
      toast.show({
        title: "Sign-out failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <PublicShell session={sessionQuery.data ?? null} onSignOut={signOut}>
      <Outlet />
    </PublicShell>
  )
}
