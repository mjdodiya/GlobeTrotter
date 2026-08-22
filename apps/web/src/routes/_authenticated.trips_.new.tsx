import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { useAppToast } from "@/components/foundation/toast"
import { TripForm, type TripFormValues } from "@/components/trips/trip-form"
import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { createTrip } from "@/lib/trip-api"

export const Route = createFileRoute("/_authenticated/trips_/new")({
  component: NewTripPage,
})

function NewTripPage() {
  const { session } = Route.useRouteContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useAppToast()
  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: async ({ data }) => {
      await Promise.all([
        queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tripLists() }),
      ])
      toast.show({ title: "Trip created", description: `${data.name} is ready to plan.` })
      await navigate({ params: { tripId: data.id }, to: "/trips/$tripId/manage" })
    },
  })
  const problem = mutation.isError ? problemFromError(mutation.error) : undefined

  function submit(values: TripFormValues) {
    mutation.mutate(values)
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-6">
      <Button asChild variant="ghost">
        <Link to="/trips">
          <ArrowLeft aria-hidden="true" /> Back to My Trips
        </Link>
      </Button>
      <header className="space-y-2">
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          Create a Trip
        </h1>
        <p className="text-muted-foreground">
          Set the Travel Period and planning currency. You can add destinations next.
        </p>
      </header>
      <section aria-labelledby="new-trip-details" className="rounded-2xl border bg-card p-5 sm:p-7">
        <h2 id="new-trip-details" className="mb-6 text-lg font-semibold">
          Trip details
        </h2>
        <TripForm
          allowPublic={session.user.emailVerified}
          canManageOwnerSettings
          initialValues={{
            name: "",
            description: null,
            startDate: "",
            endDate: "",
            budgetLimit: null,
            baseCurrency: "USD",
            visibility: "private",
          }}
          isPending={mutation.isPending}
          onSubmit={submit}
          problem={problem?.kind === "authentication" ? undefined : problem}
          submitLabel="Create Trip"
        />
      </section>
      {problem?.kind === "authentication" ? <ProblemState problem={problem} /> : null}
    </div>
  )
}
