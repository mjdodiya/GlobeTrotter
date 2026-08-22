import { createFileRoute, Outlet } from "@tanstack/react-router"

import { PublicShell } from "@/components/foundation/shells"

export const Route = createFileRoute("/_public")({
  component: () => (
    <PublicShell>
      <Outlet />
    </PublicShell>
  ),
})
