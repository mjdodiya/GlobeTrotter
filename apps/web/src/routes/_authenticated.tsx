import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router"

import { RouteErrorState, RouteLoadingState } from "@/components/foundation/route-states"
import { AuthenticatedShell, AuthenticatedShellPlaceholder } from "@/components/foundation/shells"
import { useAppToast } from "@/components/foundation/toast"
import { clearSession, sessionQueryOptions } from "@/lib/session"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions())
    if (!session) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } })
    }
    return { session }
  },
  component: AuthenticatedLayout,
  errorComponent: (props) => (
    <AuthenticatedShellPlaceholder>
      <RouteErrorState {...props} />
    </AuthenticatedShellPlaceholder>
  ),
  pendingComponent: () => (
    <AuthenticatedShellPlaceholder>
      <RouteLoadingState label="Checking your session" />
    </AuthenticatedShellPlaceholder>
  ),
})

function AuthenticatedLayout() {
  const { queryClient } = Route.useRouteContext()
  const { session } = Route.useRouteContext()
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
    <AuthenticatedShell session={session} onSignOut={signOut}>
      <Outlet />
    </AuthenticatedShell>
  )
}
