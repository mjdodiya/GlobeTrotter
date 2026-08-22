import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router"

import { RouteErrorState, RouteLoadingState } from "@/components/foundation/route-states"
import { AuthenticatedShell, AuthenticatedShellPlaceholder } from "@/components/foundation/shells"
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

  async function signOut() {
    await clearSession(queryClient)
    await router.navigate({ to: "/" })
  }

  return (
    <AuthenticatedShell session={session} onSignOut={signOut}>
      <Outlet />
    </AuthenticatedShell>
  )
}
