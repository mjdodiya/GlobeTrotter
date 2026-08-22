import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, Edit3, Plane, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useId, useState, type FormEvent, type ReactElement } from "react"

import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { problemFromError } from "@/components/foundation/problem-state"
import { StaleTripRecovery } from "@/components/foundation/stale-trip-recovery"
import { useAppToast } from "@/components/foundation/toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/lib/discovery-format"
import { itineraryQueryOptions, type Itinerary, type ItineraryStop } from "@/lib/itinerary-api"
import type { ProblemDetails } from "@/lib/problem-details"
import {
  createTravelLegRequest,
  deleteTravelLegRequest,
  previewStopOrder,
  reorderStopsFromPreviewRequest,
  type PreviewedReorderStopsInput,
  updateTravelLegRequest,
  type TravelLeg,
  type TravelLegInput,
} from "@/lib/travel-leg-api"
import {
  instantToZonedInput,
  travelLegModes,
  validateTravelLegForm,
  type TravelLegFormErrors,
  type TravelLegFormValues,
  type TravelLegMode,
  zonedInputToInstant,
} from "@/lib/travel-leg-rules"
import { tripQueryOptions, useVersionedTripMutation, type Trip } from "@/lib/trip-api"

const selectClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

function formatInstant(value: string | null, timeZone: string): string {
  if (!value) return `Time unavailable · ${timeZone}`
  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value))
  return `${formatted} · ${timeZone}`
}

function stopName(stop: ItineraryStop | undefined, fallback: string): string {
  return stop ? `${stop.city.name}, ${stop.city.countryCode}` : fallback
}

function FormProblem({ problem }: { problem?: ProblemDetails | undefined }) {
  if (!problem || problem.errors) return null
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3" role="alert">
      <p className="font-medium text-destructive">{problem.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{problem.detail}</p>
    </div>
  )
}

function fieldProblem(
  field: keyof TravelLegFormValues,
  localErrors: TravelLegFormErrors,
  problem?: ProblemDetails,
): string | undefined {
  return localErrors[field] ?? problem?.errors?.[field]?.[0]
}

function TravelLegEditorDialog({
  itinerary,
  leg,
  trip,
  trigger,
}: {
  itinerary: Itinerary
  leg?: TravelLeg | undefined
  trip: Trip
  trigger: ReactElement
}) {
  const initialFromStopId = leg?.fromStopId ?? itinerary.stops[0]?.id ?? ""
  const initialToStopId = leg?.toStopId ?? itinerary.stops[1]?.id ?? itinerary.stops[0]?.id ?? ""
  const [open, setOpen] = useState(false)
  const [fromStopId, setFromStopId] = useState(initialFromStopId)
  const [toStopId, setToStopId] = useState(initialToStopId)
  const [mode, setMode] = useState<TravelLegMode>(leg?.mode ?? "flight")
  const [localErrors, setLocalErrors] = useState<TravelLegFormErrors>({})
  const id = useId()
  const toast = useAppToast()
  const mutation = useVersionedTripMutation<TravelLegInput, TravelLeg>({
    tripId: trip.id,
    request: leg ? updateTravelLegRequest(trip.id, leg.id) : createTravelLegRequest(trip.id),
    onSuccess: () => {
      setOpen(false)
      toast.show({
        title: leg ? "Travel Leg updated" : "Travel Leg added",
        description: leg
          ? `${leg.title} now reflects your changes.`
          : "The new Travel Leg was added to the route.",
      })
    },
  })
  const problem =
    mutation.mutation.isError && !mutation.recovery
      ? problemFromError(mutation.mutation.error)
      : undefined
  const departureAt = leg?.departureAt
    ? instantToZonedInput(leg.departureAt, leg.departureTimezone)
    : ""
  const arrivalAt = leg?.arrivalAt ? instantToZonedInput(leg.arrivalAt, leg.arrivalTimezone) : ""
  const fromStop = itinerary.stops.find((stop) => stop.id === fromStopId)
  const toStop = itinerary.stops.find((stop) => stop.id === toStopId)

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setFromStopId(initialFromStopId)
      setToStopId(initialToStopId)
      setMode(leg?.mode ?? "flight")
      setLocalErrors({})
      mutation.mutation.reset()
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: TravelLegFormValues = {
      fromStopId,
      toStopId,
      mode,
      title: String(data.get("title") ?? "").trim(),
      provider: String(data.get("provider") ?? "").trim(),
      reference: String(data.get("reference") ?? "").trim(),
      departureAt: String(data.get("departureAt") ?? ""),
      arrivalAt: String(data.get("arrivalAt") ?? ""),
      estimatedCost: String(data.get("estimatedCost") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    }
    const errors = validateTravelLegForm(values, {
      departureTimezone: fromStop?.city.timezone,
      arrivalTimezone: toStop?.city.timezone,
    })
    setLocalErrors(errors)
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      ;(event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus()
      return
    }
    if (!fromStop || !toStop) return
    mutation.mutation.mutate({
      fromStopId: values.fromStopId,
      toStopId: values.toStopId,
      mode: values.mode,
      title: values.title,
      provider: values.provider || null,
      reference: values.reference || null,
      departureAt: zonedInputToInstant(values.departureAt, fromStop.city.timezone),
      arrivalAt: zonedInputToInstant(values.arrivalAt, toStop.city.timezone),
      estimatedCost: values.estimatedCost,
      notes: values.notes || null,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{leg ? `Edit ${leg.title}` : "Add a Travel Leg"}</DialogTitle>
            <DialogDescription>
              Travel Leg times use each selected endpoint's IANA time zone.
            </DialogDescription>
          </DialogHeader>
          <form key={leg?.id ?? "new"} noValidate onSubmit={submit}>
            <div className="grid gap-5 py-2">
              <FormProblem problem={problem} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldProblem("fromStopId", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-from-stop`}>Departure Stop</FieldLabel>
                  <select
                    aria-invalid={Boolean(fieldProblem("fromStopId", localErrors, problem))}
                    className={selectClassName}
                    id={`${id}-from-stop`}
                    name="fromStopId"
                    onChange={(event) => setFromStopId(event.target.value)}
                    value={fromStopId}
                  >
                    {itinerary.stops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.city.name}, {stop.city.countryCode}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>{fromStop?.city.timezone}</FieldDescription>
                  <FieldError>{fieldProblem("fromStopId", localErrors, problem)}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldProblem("toStopId", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-to-stop`}>Arrival Stop</FieldLabel>
                  <select
                    aria-invalid={Boolean(fieldProblem("toStopId", localErrors, problem))}
                    className={selectClassName}
                    id={`${id}-to-stop`}
                    name="toStopId"
                    onChange={(event) => setToStopId(event.target.value)}
                    value={toStopId}
                  >
                    {itinerary.stops.map((stop) => (
                      <option key={stop.id} value={stop.id}>
                        {stop.city.name}, {stop.city.countryCode}
                      </option>
                    ))}
                  </select>
                  <FieldDescription>{toStop?.city.timezone}</FieldDescription>
                  <FieldError>{fieldProblem("toStopId", localErrors, problem)}</FieldError>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldProblem("title", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-title`}>Travel Leg title</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("title", localErrors, problem))}
                    defaultValue={leg?.title ?? ""}
                    id={`${id}-title`}
                    maxLength={500}
                    name="title"
                    required
                  />
                  <FieldError>{fieldProblem("title", localErrors, problem)}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-mode`}>Mode</FieldLabel>
                  <select
                    className={selectClassName}
                    id={`${id}-mode`}
                    name="mode"
                    onChange={(event) => setMode(event.target.value as TravelLegMode)}
                    value={mode}
                  >
                    {travelLegModes.map((value) => (
                      <option key={value} value={value}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldProblem("departureAt", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-departure`}>Departure date and time</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("departureAt", localErrors, problem))}
                    defaultValue={departureAt}
                    id={`${id}-departure`}
                    name="departureAt"
                    required
                    type="datetime-local"
                  />
                  <FieldDescription>Local time · {fromStop?.city.timezone}</FieldDescription>
                  <FieldError>{fieldProblem("departureAt", localErrors, problem)}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldProblem("arrivalAt", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-arrival`}>Arrival date and time</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("arrivalAt", localErrors, problem))}
                    defaultValue={arrivalAt}
                    id={`${id}-arrival`}
                    name="arrivalAt"
                    required
                    type="datetime-local"
                  />
                  <FieldDescription>Local time · {toStop?.city.timezone}</FieldDescription>
                  <FieldError>{fieldProblem("arrivalAt", localErrors, problem)}</FieldError>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`${id}-provider`}>Provider</FieldLabel>
                  <Input
                    defaultValue={leg?.provider ?? ""}
                    id={`${id}-provider`}
                    maxLength={500}
                    name="provider"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${id}-reference`}>Booking reference</FieldLabel>
                  <Input
                    defaultValue={leg?.reference ?? ""}
                    id={`${id}-reference`}
                    maxLength={500}
                    name="reference"
                  />
                </Field>
              </div>
              <Field data-invalid={Boolean(fieldProblem("estimatedCost", localErrors, problem))}>
                <FieldLabel htmlFor={`${id}-cost`}>Estimated cost ({trip.baseCurrency})</FieldLabel>
                <Input
                  aria-invalid={Boolean(fieldProblem("estimatedCost", localErrors, problem))}
                  defaultValue={leg?.estimatedCost ?? "0"}
                  id={`${id}-cost`}
                  inputMode="decimal"
                  name="estimatedCost"
                  required
                />
                <FieldError>{fieldProblem("estimatedCost", localErrors, problem)}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-notes`}>Private notes</FieldLabel>
                <Textarea
                  defaultValue={leg?.notes ?? ""}
                  id={`${id}-notes`}
                  maxLength={20_000}
                  name="notes"
                  rows={3}
                />
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={mutation.mutation.isPending} type="submit">
                {mutation.mutation.isPending
                  ? "Saving Travel Leg…"
                  : leg
                    ? "Save Travel Leg"
                    : "Add Travel Leg"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {mutation.recovery ? <StaleTripRecovery {...mutation.recovery} /> : null}
    </>
  )
}

function DeleteTravelLegControl({ leg, trip }: { leg: TravelLeg; trip: Trip }) {
  const toast = useAppToast()
  const deletion = useVersionedTripMutation<void, undefined>({
    tripId: trip.id,
    request: deleteTravelLegRequest(trip.id, leg.id),
    onSuccess: () => {
      toast.show({ title: "Travel Leg removed", description: `${leg.title} was removed.` })
    },
  })
  const problem =
    deletion.mutation.isError && !deletion.recovery
      ? problemFromError(deletion.mutation.error)
      : undefined

  return (
    <>
      <DestructiveConfirmation
        confirmLabel={`Remove ${leg.title}`}
        description={`This permanently removes ${leg.title}. Its endpoints will not be retargeted.`}
        onConfirm={() => deletion.mutation.mutate()}
        title={`Remove ${leg.title}?`}
        trigger={
          <Button
            aria-label={`Remove ${leg.title}`}
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
      {problem ? (
        <p className="text-sm text-destructive" role="alert">
          {problem.title}: {problem.detail}
        </p>
      ) : null}
    </>
  )
}

function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function daysBetween(first: string, second: string): number {
  return Math.round(
    (Date.parse(`${second}T00:00:00.000Z`) - Date.parse(`${first}T00:00:00.000Z`)) /
      (24 * 60 * 60 * 1_000),
  )
}

type RoutePreviewState = Awaited<ReturnType<typeof previewStopOrder>> & { stopIds: string[] }

function RouteOrderPlanner({ itinerary, trip }: { itinerary: Itinerary; trip: Trip }) {
  const toast = useAppToast()
  const queryClient = useQueryClient()
  const initialOrder = itinerary.stops.map((stop) => stop.id)
  const [order, setOrder] = useState(initialOrder)
  const [preview, setPreview] = useState<RoutePreviewState>()
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState("")
  const [refreshingStaleRoute, setRefreshingStaleRoute] = useState(false)
  const [staleRefreshError, setStaleRefreshError] = useState<string>()
  const stopById = new Map(itinerary.stops.map((stop) => [stop.id, stop]))
  const legById = new Map(itinerary.legs.map((leg) => [leg.id, leg]))
  const displayedStops = order.flatMap((stopId) => {
    const stop = stopById.get(stopId)
    return stop ? [stop] : []
  })
  const changed = order.some((stopId, index) => stopId !== initialOrder[index])
  const previewMutation = useMutation({
    mutationFn: (stopIds: string[]) => previewStopOrder(trip.id, stopIds),
    onMutate: () => {
      setPreview(undefined)
      setSelectedRemovals([])
    },
    onSuccess: (result, stopIds) => {
      setPreview({ ...result, stopIds })
      setAnnouncement(
        `Route preview ready. ${result.data.affectedLegIds.length} Travel Legs are affected.`,
      )
    },
  })
  const commit = useVersionedTripMutation<PreviewedReorderStopsInput, unknown>({
    tripId: trip.id,
    request: reorderStopsFromPreviewRequest(trip.id),
    onSuccess: () => {
      setPreview(undefined)
      setSelectedRemovals([])
      setAnnouncement("Route order updated.")
      toast.show({
        title: "Route order updated",
        description: "Stop dates were reflowed and the confirmed Travel Legs were removed.",
      })
    },
  })
  const previewProblem = previewMutation.isError
    ? problemFromError(previewMutation.error)
    : undefined
  const commitProblem =
    commit.mutation.isError && !commit.recovery
      ? problemFromError(commit.mutation.error)
      : undefined
  const exactResolution =
    preview !== undefined &&
    selectedRemovals.length === preview.data.affectedLegIds.length &&
    preview.data.affectedLegIds.every((legId) => selectedRemovals.includes(legId))

  function moveStop(index: number, offset: -1 | 1) {
    const target = index + offset
    if (target < 0 || target >= order.length) return
    const next = [...order]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    setOrder(next)
    setPreview(undefined)
    setSelectedRemovals([])
    previewMutation.reset()
    commit.mutation.reset()
    const stop = stopById.get(moved)
    setAnnouncement(
      `${stop?.city.name ?? "Stop"} moved to position ${target + 1}. Preview the route before committing.`,
    )
  }

  function toggleRemoval(legId: string, selected: boolean) {
    setSelectedRemovals((current) =>
      selected ? [...current, legId] : current.filter((currentId) => currentId !== legId),
    )
  }

  async function reloadStaleRoute() {
    setRefreshingStaleRoute(true)
    setStaleRefreshError(undefined)
    try {
      await queryClient.fetchQuery({ ...tripQueryOptions(trip.id), staleTime: 0 })
      await queryClient.fetchQuery({ ...itineraryQueryOptions(trip.id), staleTime: 0 })
      commit.recovery?.onCancel()
      setOrder(initialOrder)
      setPreview(undefined)
      setSelectedRemovals([])
      previewMutation.reset()
      setAnnouncement("Latest route loaded. Move Stops and create a new preview.")
    } catch {
      setStaleRefreshError("The latest route could not be loaded. Check your connection and retry.")
    } finally {
      setRefreshingStaleRoute(false)
    }
  }

  if (itinerary.stops.length < 2) return null

  return (
    <section aria-labelledby="route-order-heading" className="space-y-4 rounded-xl border p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 id="route-order-heading" className="text-xl font-semibold">
            Route order
          </h3>
          <p className="text-sm text-muted-foreground">
            Move Stops with buttons, then preview every date and Travel Leg consequence.
          </p>
        </div>
        <Button
          disabled={!changed || previewMutation.isPending || commit.mutation.isPending}
          onClick={() => previewMutation.mutate(order)}
          type="button"
          variant="outline"
        >
          <RefreshCw aria-hidden="true" />
          {previewMutation.isPending ? "Previewing route…" : "Preview route changes"}
        </Button>
      </header>

      <ol className="grid gap-2">
        {displayedStops.map((stop, index) => (
          <li
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
            key={stop.id}
          >
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Position {index + 1}</p>
              <p className="font-medium">{stop.city.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatLocalDate(stop.startDate)} – {formatLocalDate(stop.endDate)} departure
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                aria-label={`Move ${stop.city.name} up`}
                disabled={index === 0 || previewMutation.isPending || commit.mutation.isPending}
                onClick={() => moveStop(index, -1)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                aria-label={`Move ${stop.city.name} down`}
                disabled={
                  index === displayedStops.length - 1 ||
                  previewMutation.isPending ||
                  commit.mutation.isPending
                }
                onClick={() => moveStop(index, 1)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>

      {previewProblem ? (
        <p className="text-sm text-destructive" role="alert">
          {previewProblem.title}: {previewProblem.detail}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <div>
            <h4 className="font-semibold">Review route consequences</h4>
            <p className="text-sm text-muted-foreground">
              Stop durations follow their Stops. Original route-position gaps are retained.
            </p>
          </div>
          <ol className="grid gap-2 text-sm">
            {preview.data.stops.map((plannedStop, index) => {
              const original = stopById.get(plannedStop.id)
              const next = preview.data.stops[index + 1]
              const gap = next ? daysBetween(plannedStop.endDate, next.startDate) : 0
              return (
                <li
                  aria-label={`${original?.city.name ?? plannedStop.id} route preview`}
                  className="rounded-lg border bg-background p-3"
                  key={plannedStop.id}
                >
                  <p>
                    <span className="font-medium">{original?.city.name ?? plannedStop.id}</span> ·{" "}
                    {original
                      ? `${formatLocalDate(original.startDate)} – ${formatLocalDate(original.endDate)}`
                      : "Dates unavailable"}{" "}
                    → {formatLocalDate(plannedStop.startDate)} –{" "}
                    {formatLocalDate(plannedStop.endDate)}
                  </p>
                  {next ? (
                    <p className="mt-1 text-muted-foreground">
                      {gap === 0
                        ? "No Planning Gap before the next Stop"
                        : `${gap}-day Planning Gap before the next Stop`}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
          {preview.data.affectedLegIds.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="font-semibold">Travel Legs requiring explicit removal</legend>
              <p className="text-sm text-muted-foreground">
                The route will not retarget or delete these automatically. Select every listed
                Travel Leg to confirm its removal.
              </p>
              {preview.data.affectedLegIds.map((legId) => {
                const leg = legById.get(legId)
                return (
                  <label
                    className="flex items-start gap-2 rounded-lg border bg-background p-3"
                    key={legId}
                  >
                    <input
                      checked={selectedRemovals.includes(legId)}
                      className="mt-1"
                      onChange={(event) => toggleRemoval(legId, event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      Remove <span className="font-medium">{leg?.title ?? legId}</span>
                      {leg ? (
                        <span className="block text-sm text-muted-foreground">
                          {stopName(stopById.get(leg.fromStopId), "Origin")} →{" "}
                          {stopName(stopById.get(leg.toStopId), "Destination")}
                        </span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          ) : (
            <p className="text-sm">No Travel Legs are affected by this route change.</p>
          )}
          {commitProblem ? (
            <p className="text-sm text-destructive" role="alert">
              {commitProblem.title}: {commitProblem.detail}
            </p>
          ) : null}
          <Button
            disabled={!exactResolution || commit.mutation.isPending}
            onClick={() =>
              commit.mutation.mutate({
                stopIds: preview.stopIds,
                removeLegIds: selectedRemovals,
                previewEtag: preview.etag,
              })
            }
            type="button"
          >
            {commit.mutation.isPending ? "Updating route…" : "Commit route order"}
          </Button>
        </div>
      ) : null}
      {commit.recovery ? (
        <div
          aria-labelledby="stale-route-heading"
          className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          role="alert"
        >
          <div>
            <h4 id="stale-route-heading" className="font-semibold">
              Route preview is stale
            </h4>
            <p className="text-sm text-muted-foreground">
              {commit.recovery.problem.detail} Reload the current Trip and itinerary, then create a
              new preview. The old removal confirmation cannot be reused.
            </p>
          </div>
          {staleRefreshError ? (
            <p className="text-sm text-destructive">{staleRefreshError}</p>
          ) : null}
          <Button
            disabled={refreshingStaleRoute}
            onClick={() => void reloadStaleRoute()}
            type="button"
            variant="outline"
          >
            {refreshingStaleRoute ? "Reloading latest route…" : "Reload latest route"}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

export function TravelLegWorkspace({ itinerary, trip }: { itinerary: Itinerary; trip: Trip }) {
  const stops = new Map(itinerary.stops.map((stop) => [stop.id, stop]))

  return (
    <div className="space-y-8">
      {trip.access.canEdit ? (
        <RouteOrderPlanner key={itinerary.version} itinerary={itinerary} trip={trip} />
      ) : null}
      <section aria-labelledby="travel-legs-heading" className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 id="travel-legs-heading" className="text-xl font-semibold">
              Travel Legs
            </h3>
            <p className="text-sm text-muted-foreground">
              Plan movement between Stops using each endpoint’s local time.
            </p>
          </div>
          {trip.access.canEdit ? (
            <TravelLegEditorDialog
              itinerary={itinerary}
              trip={trip}
              trigger={
                <Button disabled={itinerary.stops.length < 2} type="button" variant="outline">
                  <Plus aria-hidden="true" /> Add Travel Leg
                </Button>
              }
            />
          ) : null}
        </header>
        {itinerary.legs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center">
            <p className="font-medium">No Travel Legs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {itinerary.stops.length < 2
                ? "Add at least two Stops before planning movement between them."
                : "Add a Travel Leg between two Stops when the route is known."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {itinerary.legs.map((leg) => (
              <Card key={leg.id} size="sm">
                <CardHeader className="sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {leg.mode}
                    </p>
                    <CardTitle className="text-base">{leg.title}</CardTitle>
                  </div>
                  {trip.access.canEdit ? (
                    <div className="flex items-center gap-1">
                      <TravelLegEditorDialog
                        itinerary={itinerary}
                        leg={leg}
                        trip={trip}
                        trigger={
                          <Button
                            aria-label={`Edit ${leg.title}`}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Edit3 aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DeleteTravelLegControl leg={leg} trip={trip} />
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Plane className="size-4" aria-hidden="true" />
                    {stopName(stops.get(leg.fromStopId), "Origin")} →{" "}
                    {stopName(stops.get(leg.toStopId), "Destination")}
                  </p>
                  <dl className="grid gap-2 text-muted-foreground">
                    <div>
                      <dt className="font-medium text-foreground">Departure</dt>
                      <dd>{formatInstant(leg.departureAt, leg.departureTimezone)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Arrival</dt>
                      <dd>{formatInstant(leg.arrivalAt, leg.arrivalTimezone)}</dd>
                    </div>
                  </dl>
                  {leg.provider || leg.reference ? (
                    <p className="text-muted-foreground">
                      {[leg.provider, leg.reference].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  <p className="font-medium">
                    {formatMoney(leg.estimatedCost, trip.baseCurrency)} estimated
                  </p>
                  {leg.notes ? (
                    <p className="rounded-md bg-muted/40 p-2 text-muted-foreground">
                      <span className="font-medium text-foreground">Private note:</span> {leg.notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
