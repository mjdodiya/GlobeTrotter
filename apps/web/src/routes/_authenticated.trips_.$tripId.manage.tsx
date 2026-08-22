import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, CalendarDays, LockKeyhole, Trash2, WalletCards } from "lucide-react"

import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { StaleTripRecovery } from "@/components/foundation/stale-trip-recovery"
import { useAppToast } from "@/components/foundation/toast"
import { ItineraryWorkspace } from "@/components/trips/itinerary-workspace"
import { TripForm, type TripFormValues } from "@/components/trips/trip-form"
import { TripStatusBadge } from "@/components/trips/trip-summary-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateRange, formatMoney } from "@/lib/discovery-format"
import {
  deleteTripRequest,
  tripQueryOptions,
  updateTripRequest,
  useVersionedTripMutation,
  type Trip,
  type UpdateTripInput,
} from "@/lib/trip-api"
import { tripAccessLabel, tripActions } from "@/lib/trip-presentation"

export const Route = createFileRoute("/_authenticated/trips_/$tripId/manage")({
  component: ManageTripPage,
})

function ManageTripPage() {
  const { session } = Route.useRouteContext()
  const { tripId } = Route.useParams()
  const navigate = useNavigate()
  const toast = useAppToast()
  const tripQuery = useQuery(tripQueryOptions(tripId))
  const update = useVersionedTripMutation<UpdateTripInput, Trip>({
    tripId,
    request: updateTripRequest(tripId),
    onSuccess: ({ data }) => {
      toast.show({ title: "Trip updated", description: `${data.name} now reflects your changes.` })
    },
  })
  const deletion = useVersionedTripMutation<void, undefined>({
    tripId,
    request: deleteTripRequest(tripId),
    removeTripOnSuccess: true,
    onSuccess: async () => {
      toast.show({
        title: "Trip deleted",
        description: "The Trip and its planning data were removed.",
      })
      await navigate({ to: "/trips" })
    },
  })

  if (tripQuery.isPending) return <RouteLoadingState label="Loading Trip" />
  if (tripQuery.isError) {
    return (
      <ProblemState
        onRetry={() => void tripQuery.refetch()}
        problem={problemFromError(tripQuery.error)}
      />
    )
  }

  const trip = tripQuery.data.data
  const actions = tripActions(trip.access)
  const updateProblem =
    update.mutation.isError && !update.recovery
      ? problemFromError(update.mutation.error)
      : undefined

  function save(values: TripFormValues) {
    const input: UpdateTripInput = {
      name: values.name,
      description: values.description,
      startDate: values.startDate,
      endDate: values.endDate,
      budgetLimit: values.budgetLimit,
      ...(actions.canManageOwnerSettings
        ? { baseCurrency: values.baseCurrency, visibility: values.visibility }
        : {}),
    }
    update.mutation.mutate(input)
  }

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-8">
      <Button asChild variant="ghost">
        <Link to="/trips">
          <ArrowLeft aria-hidden="true" /> Back to My Trips
        </Link>
      </Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <TripStatusBadge status={trip.status} />
            <Badge variant="outline">{tripAccessLabel(trip.access)}</Badge>
            <Badge variant="outline">{trip.visibility === "public" ? "Public" : "Private"}</Badge>
          </div>
          <h1
            data-route-heading
            tabIndex={-1}
            className="text-3xl font-semibold tracking-tight break-words"
          >
            {trip.name}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            {trip.description ?? "No Trip description has been added yet."}
          </p>
        </div>
        {actions.canDelete ? (
          <DestructiveConfirmation
            confirmLabel={`Delete ${trip.name}`}
            description={`This permanently deletes ${trip.name}, including its Stops, itinerary items, Travel Legs, memberships, and Share Links. This cannot be undone.`}
            onConfirm={() => deletion.mutation.mutate()}
            title={`Delete ${trip.name}?`}
            trigger={
              <Button disabled={deletion.mutation.isPending} type="button" variant="destructive">
                <Trash2 aria-hidden="true" /> Delete Trip
              </Button>
            }
          />
        ) : null}
      </header>

      <ItineraryWorkspace trip={trip} />

      <Card>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden="true" /> Travel Period
              </dt>
              <dd className="mt-1 font-semibold">
                {formatDateRange(trip.startDate, trip.endDate)}
              </dd>
              <dd className="text-xs text-muted-foreground">End is the departure date</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Destinations</dt>
              <dd className="mt-1 font-semibold">{trip.destinationCount}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletCards className="size-4" aria-hidden="true" /> Estimated total
              </dt>
              <dd className="mt-1 font-semibold">
                {formatMoney(trip.estimatedCost, trip.baseCurrency)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Budget Limit</dt>
              <dd className="mt-1 font-semibold">
                {trip.budgetLimit === null
                  ? "No limit"
                  : formatMoney(trip.budgetLimit, trip.baseCurrency)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {actions.canEdit ? (
        <section
          aria-labelledby="edit-trip-heading"
          className="rounded-2xl border bg-card p-5 sm:p-7"
        >
          <header className="mb-6 space-y-1">
            <h2 id="edit-trip-heading" className="text-xl font-semibold">
              Edit Trip details
            </h2>
            <p className="text-sm text-muted-foreground">
              {actions.canManageOwnerSettings
                ? "As Trip Owner, you can also control Base Currency and visibility."
                : "Editors can update planning details. Owner-controlled settings remain read-only."}
            </p>
          </header>
          <TripForm
            key={trip.version}
            allowPublic={session.user.emailVerified}
            canManageOwnerSettings={actions.canManageOwnerSettings}
            initialValues={{
              name: trip.name,
              description: trip.description,
              startDate: trip.startDate,
              endDate: trip.endDate,
              budgetLimit: trip.budgetLimit,
              baseCurrency: trip.baseCurrency,
              visibility: trip.visibility,
            }}
            isPending={update.mutation.isPending}
            onSubmit={save}
            problem={updateProblem}
            submitLabel="Save changes"
          />
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border bg-muted/25 p-5">
          <LockKeyhole
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold">Read-only Member Trip</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Viewer access lets you follow the latest plan. Ask the Trip Owner for editor access if
              you need to make changes.
            </p>
          </div>
        </section>
      )}

      {update.recovery ? <StaleTripRecovery {...update.recovery} /> : null}
      {deletion.recovery ? <StaleTripRecovery {...deletion.recovery} /> : null}
      {deletion.mutation.isError && !deletion.recovery ? (
        <ProblemState problem={problemFromError(deletion.mutation.error)} />
      ) : null}
    </div>
  )
}
