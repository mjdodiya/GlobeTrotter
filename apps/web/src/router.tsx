import type { QueryClient } from "@tanstack/react-query"
import { createRouter, type RouterHistory } from "@tanstack/react-router"

import { RouteErrorState, RouteLoadingState } from "./components/foundation/route-states"
import { queryClient } from "./lib/query-client"
import { routeTree } from "./routeTree.gen"

export function createAppRouter(options: { history?: RouterHistory; queryClient: QueryClient }) {
  return createRouter({
    context: { queryClient: options.queryClient },
    defaultErrorComponent: RouteErrorState,
    defaultPendingComponent: RouteLoadingState,
    defaultPendingMinMs: 300,
    defaultPendingMs: 150,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    ...(options.history ? { history: options.history } : {}),
    routeTree,
  })
}

export const router = createAppRouter({ queryClient })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
