import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router"

import { RouteFocus } from "@/components/foundation/route-focus"
import { NotFoundState } from "@/components/foundation/route-states"
import { PublicShell } from "@/components/foundation/shells"
import { AppToastProvider } from "@/components/foundation/toast"

export type RouterContext = {
  queryClient: QueryClient
}

function RootLayout() {
  return (
    <AppToastProvider>
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[200] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg focus:translate-y-0"
      >
        Skip to main content
      </a>
      <RouteFocus />
      <Outlet />
    </AppToastProvider>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <PublicShell>
      <NotFoundState />
    </PublicShell>
  ),
})
