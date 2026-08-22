import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  CalendarDays,
  CircleAlert,
  Clock3,
  Edit3,
  ExternalLink,
  GripVertical,
  MapPin,
  Plus,
  Trash2,
  WalletCards,
} from "lucide-react"

import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { StaleTripRecovery } from "@/components/foundation/stale-trip-recovery"
import { useAppToast } from "@/components/foundation/toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateRange, formatDuration, formatMoney } from "@/lib/discovery-format"
import {
  deleteItemRequest,
  deleteStopRequest,
  itineraryQueryOptions,
  reorderItemsRequest,
  type Itinerary,
  type ItineraryItem,
  type ItineraryStop,
} from "@/lib/itinerary-api"
import { useVersionedTripMutation, type Trip } from "@/lib/trip-api"

import { ItemEditorDialog, StopEditorDialog } from "./itinerary-forms"

function formatLocalDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00.000Z`))
}

function itemKindLabel(kind: ItineraryItem["kind"]): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function warningGuidance(code: Itinerary["warnings"][number]["code"]): string {
  switch (code) {
    case "ACCOMMODATION_GAP":
      return "Add or extend a Stay to cover each night."
    case "MISSING_TRAVEL_LEG":
      return "Add a Travel Leg between these adjacent Stops."
    case "TRAVEL_LEG_ARRIVAL_OUTSIDE_DESTINATION":
      return "Review the arrival instant against the destination’s local dates."
    case "TRAVEL_LEG_DEPARTURE_OUTSIDE_ORIGIN":
      return "Review the departure instant against the origin’s local dates."
    case "UNPLANNED_DAYS":
      return "Add a Stop or adjust dates if those days should be planned."
  }
}

function InlineMutationProblem({ error }: { error: Error | null }) {
  if (!error) return null
  const problem = problemFromError(error)
  return (
    <p className="text-sm text-destructive" role="alert">
      {problem.title}: {problem.detail}
    </p>
  )
}

function CompletenessWarnings({ itinerary }: { itinerary: Itinerary }) {
  if (itinerary.warnings.length === 0) {
    return (
      <Alert className="border-emerald-500/25 bg-emerald-500/5">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Schedule coverage looks complete</AlertTitle>
        <AlertDescription>
          No itinerary completeness guidance is currently outstanding.
        </AlertDescription>
      </Alert>
    )
  }

  const stopNames = new Map(itinerary.stops.map((stop) => [stop.id, stop.city.name]))
  return (
    <section aria-labelledby="completeness-heading" className="space-y-3">
      <div>
        <h3 id="completeness-heading" className="font-semibold">
          Completeness guidance
        </h3>
        <p className="text-sm text-muted-foreground">
          These suggestions do not block editing or publication.
        </p>
      </div>
      <ul className="grid gap-2">
        {itinerary.warnings.map((warning) => {
          const affectedStops = warning.stopIds.flatMap((stopId) => {
            const name = stopNames.get(stopId)
            return name ? [name] : []
          })
          return (
            <li key={`${warning.code}-${warning.stopIds.join("-")}-${warning.message}`}>
              <Alert>
                <CircleAlert aria-hidden="true" />
                <AlertTitle>
                  {warning.message}
                  {affectedStops.length > 0 ? ` · ${affectedStops.join(" → ")}` : ""}
                </AlertTitle>
                <AlertDescription>
                  {warningGuidance(warning.code)}{" "}
                  {warning.stopIds[0] ? (
                    <a href={`#stop-${warning.stopIds[0]}`}>Review affected Stop</a>
                  ) : null}
                </AlertDescription>
              </Alert>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DeleteStopControl({ stop, trip }: { stop: ItineraryStop; trip: Trip }) {
  const toast = useAppToast()
  const deletion = useVersionedTripMutation<void, undefined>({
    tripId: trip.id,
    request: deleteStopRequest(trip.id, stop.id),
    onSuccess: () => {
      toast.show({
        title: "Stop removed",
        description: `${stop.city.name} and its itinerary items were removed.`,
      })
    },
  })
  return (
    <>
      <DestructiveConfirmation
        confirmLabel={`Remove ${stop.city.name}`}
        description={`This removes ${stop.city.name} and every itinerary item in the Stop. This cannot be undone.`}
        onConfirm={() => deletion.mutation.mutate()}
        title={`Remove ${stop.city.name}?`}
        trigger={
          <Button
            aria-label={`Remove ${stop.city.name}`}
            disabled={deletion.mutation.isPending}
            size="icon-sm"
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        }
      />
      {deletion.recovery ? <StaleTripRecovery {...deletion.recovery} /> : null}
      <InlineMutationProblem
        error={deletion.mutation.isError && !deletion.recovery ? deletion.mutation.error : null}
      />
    </>
  )
}

function DeleteItemControl({
  item,
  stop,
  trip,
}: {
  item: ItineraryItem
  stop: ItineraryStop
  trip: Trip
}) {
  const toast = useAppToast()
  const deletion = useVersionedTripMutation<void, undefined>({
    tripId: trip.id,
    request: deleteItemRequest(trip.id, stop.id, item.id),
    onSuccess: () => {
      toast.show({ title: "Itinerary item removed", description: `${item.title} was removed.` })
    },
  })
  return (
    <>
      <DestructiveConfirmation
        confirmLabel={`Remove ${item.title}`}
        description={`This removes ${item.title} from ${stop.city.name}. This cannot be undone.`}
        onConfirm={() => deletion.mutation.mutate()}
        title={`Remove ${item.title}?`}
        trigger={
          <Button
            aria-label={`Remove ${item.title}`}
            disabled={deletion.mutation.isPending}
            size="icon-sm"
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        }
      />
      {deletion.recovery ? <StaleTripRecovery {...deletion.recovery} /> : null}
      <InlineMutationProblem
        error={deletion.mutation.isError && !deletion.recovery ? deletion.mutation.error : null}
      />
    </>
  )
}

function ItemSchedule({ item, timezone }: { item: ItineraryItem; timezone: string }) {
  if (item.kind === "stay" && item.endDate) {
    return (
      <span className="flex items-start gap-2">
        <BedDouble className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Check in {formatLocalDate(item.scheduledDate)}
          {item.startTime ? ` at ${item.startTime.slice(0, 5)}` : ""}; check out{" "}
          {formatLocalDate(item.endDate)}
          {item.endTime ? ` at ${item.endTime.slice(0, 5)}` : ""}
          <span className="block text-xs">Local time · {timezone}</span>
        </span>
      </span>
    )
  }
  return (
    <span className="flex items-start gap-2">
      <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        {formatLocalDate(item.scheduledDate)}
        {item.startTime ? ` at ${item.startTime.slice(0, 5)}` : ""}
        <span className="block text-xs">Local time · {timezone}</span>
      </span>
    </span>
  )
}

function ItineraryItemCard({
  canEdit,
  index,
  item,
  itemCount,
  move,
  reorderPending,
  stop,
  trip,
}: {
  canEdit: boolean
  index: number
  item: ItineraryItem
  itemCount: number
  move: (from: number, to: number) => void
  reorderPending: boolean
  stop: ItineraryStop
  trip: Trip
}) {
  return (
    <li>
      <Card size="sm">
        <CardHeader className="gap-2 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{itemKindLabel(item.kind)}</Badge>
              {item.sourceActivityId ? (
                <Badge asChild variant="outline">
                  <Link params={{ activityId: item.sourceActivityId }} to="/activities/$activityId">
                    Catalog source <ExternalLink aria-hidden="true" />
                  </Link>
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-base">{item.title}</CardTitle>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="sr-only">Reorder {item.title}</span>
              <GripVertical className="size-4 text-muted-foreground" aria-hidden="true" />
              <Button
                aria-label={`Move ${item.title} up`}
                disabled={index === 0 || reorderPending}
                onClick={() => move(index, index - 1)}
                size="icon-sm"
                title={`Move ${item.title} up`}
                type="button"
                variant="ghost"
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                aria-label={`Move ${item.title} down`}
                disabled={index === itemCount - 1 || reorderPending}
                onClick={() => move(index, index + 1)}
                size="icon-sm"
                title={`Move ${item.title} down`}
                type="button"
                variant="ghost"
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <ItemEditorDialog
                item={item}
                stop={stop}
                trip={trip}
                trigger={
                  <Button
                    aria-label={`Edit ${item.title}`}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Edit3 aria-hidden="true" />
                  </Button>
                }
              />
              <DeleteItemControl item={item} stop={stop} trip={trip} />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <ItemSchedule item={item} timezone={stop.city.timezone} />
            <span className="flex items-start gap-2">
              <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {formatDuration(item.durationMinutes)}
            </span>
            <span className="flex items-start gap-2">
              <WalletCards className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {formatMoney(item.estimatedCost, trip.baseCurrency)}
            </span>
          </div>
          {item.notes ? (
            <p className="rounded-md bg-muted/40 p-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Planning note:</span> {item.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  )
}

function StopItems({ canEdit, stop, trip }: { canEdit: boolean; stop: ItineraryStop; trip: Trip }) {
  const toast = useAppToast()
  const orderedItems = stop.items.toSorted((first, second) => first.position - second.position)
  const reorder = useVersionedTripMutation<{ itemIds: string[] }, unknown>({
    tripId: trip.id,
    request: reorderItemsRequest(trip.id, stop.id),
    onSuccess: () => {
      toast.show({
        title: "Itinerary order updated",
        description: `${stop.city.name} has a new item order.`,
      })
    },
  })

  function move(from: number, to: number) {
    const itemIds = orderedItems.map((item) => item.id)
    const [moved] = itemIds.splice(from, 1)
    if (!moved) return
    itemIds.splice(to, 0, moved)
    reorder.mutation.mutate({ itemIds })
  }

  if (orderedItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center">
        <p className="font-medium">No itinerary items yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {canEdit
            ? "Add a Catalog Activity or a custom activity, transport, Stay, meal, note, or other item."
            : "This Stop has not been planned in detail yet."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ol aria-label={`${stop.city.name} itinerary items`} className="grid gap-3">
        {orderedItems.map((item, index) => (
          <ItineraryItemCard
            key={item.id}
            canEdit={canEdit}
            index={index}
            item={item}
            itemCount={orderedItems.length}
            move={move}
            reorderPending={reorder.mutation.isPending}
            stop={stop}
            trip={trip}
          />
        ))}
      </ol>
      {reorder.recovery ? <StaleTripRecovery {...reorder.recovery} /> : null}
      <InlineMutationProblem
        error={reorder.mutation.isError && !reorder.recovery ? reorder.mutation.error : null}
      />
    </div>
  )
}

function StopSection({
  canEdit,
  index,
  stop,
  trip,
}: {
  canEdit: boolean
  index: number
  stop: ItineraryStop
  trip: Trip
}) {
  return (
    <article
      aria-labelledby={`stop-${stop.id}-heading`}
      className="scroll-mt-24 rounded-2xl border bg-card shadow-sm"
      id={`stop-${stop.id}`}
    >
      <header className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Stop {index + 1}
          </p>
          <h3 id={`stop-${stop.id}-heading`} className="text-xl font-semibold">
            {stop.city.name}, {stop.city.countryCode}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatDateRange(stop.startDate, stop.endDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {stop.city.timezone}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stop.endDate} is the excluded Stop departure date.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <StopEditorDialog
              stop={stop}
              trip={trip}
              trigger={
                <Button type="button" variant="outline">
                  <Edit3 aria-hidden="true" /> Edit Stop
                </Button>
              }
            />
            <DeleteStopControl stop={stop} trip={trip} />
          </div>
        ) : null}
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        {stop.notes ? (
          <p className="rounded-lg bg-muted/35 p-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Stop notes:</span> {stop.notes}
          </p>
        ) : null}
        <StopItems canEdit={canEdit} stop={stop} trip={trip} />
      </div>
      {canEdit ? (
        <footer className="flex border-t bg-muted/20 p-4 sm:justify-end">
          <ItemEditorDialog stop={stop} trip={trip} />
        </footer>
      ) : null}
    </article>
  )
}

export function ItineraryWorkspace({ trip }: { trip: Trip }) {
  const itineraryQuery = useQuery(itineraryQueryOptions(trip.id))
  const canEdit = trip.access.canEdit

  return (
    <section aria-labelledby="itinerary-heading" className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Trip workspace
          </p>
          <h2 id="itinerary-heading" className="text-2xl font-semibold tracking-tight">
            Itinerary
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Plan each city in local time. Stop departure dates are excluded from ordinary activity
            scheduling.
          </p>
        </div>
        {canEdit ? (
          <StopEditorDialog
            trip={trip}
            trigger={
              <Button type="button">
                <Plus aria-hidden="true" /> Add Stop
              </Button>
            }
          />
        ) : (
          <Badge variant="outline">Read-only itinerary</Badge>
        )}
      </header>

      {itineraryQuery.isPending ? <RouteLoadingState label="Loading itinerary" /> : null}
      {itineraryQuery.isError ? (
        <ProblemState
          onRetry={() => void itineraryQuery.refetch()}
          problem={problemFromError(itineraryQuery.error)}
        />
      ) : null}
      {itineraryQuery.data ? (
        <>
          <CompletenessWarnings itinerary={itineraryQuery.data.data} />
          {itineraryQuery.data.data.stops.length === 0 ? (
            <Card className="border-dashed py-10 text-center">
              <CardContent>
                <p className="font-semibold">No Stops yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {canEdit
                    ? "Start with a Catalog City and its local travel dates."
                    : "The Trip Owner has not added any Stops yet."}
                </p>
              </CardContent>
              {canEdit ? (
                <CardFooter className="justify-center border-0 bg-transparent">
                  <StopEditorDialog
                    trip={trip}
                    trigger={
                      <Button type="button">
                        <Plus aria-hidden="true" /> Add the first Stop
                      </Button>
                    }
                  />
                </CardFooter>
              ) : null}
            </Card>
          ) : (
            <div className="grid gap-5">
              {itineraryQuery.data.data.stops.map((stop, index) => (
                <StopSection
                  key={stop.id}
                  canEdit={canEdit}
                  index={index}
                  stop={stop}
                  trip={trip}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
