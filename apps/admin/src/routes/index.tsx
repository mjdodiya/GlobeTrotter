import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: AdminHome,
})

function AdminHome() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">GlobeTrotter</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
      </div>
    </main>
  )
}
