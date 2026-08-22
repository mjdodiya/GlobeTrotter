import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { useId, useState, type FormEvent, type ReactElement } from "react"

import { problemFromError } from "@/components/foundation/problem-state"
import { StaleTripRecovery } from "@/components/foundation/stale-trip-recovery"
import { useAppToast } from "@/components/foundation/toast"
import { Button } from "@/components/ui/button"
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
import {
  activitiesQueryOptions,
  catalogCityOptionsQueryOptions,
  type CatalogActivity,
} from "@/lib/discovery-api"
import { formatDuration, formatMoney } from "@/lib/discovery-format"
import { uniqueById } from "@/lib/discovery-search"
import {
  createItemRequest,
  createStopRequest,
  updateItemRequest,
  updateStopRequest,
  type CreateItemInput,
  type CreateStopInput,
  type ItemKind,
  type ItineraryItem,
  type ItineraryStop,
  type UpdateItemInput,
} from "@/lib/itinerary-api"
import {
  apiTime,
  inputTime,
  previousDate,
  validateItemForm,
  validateStopForm,
  type ItemFormErrors,
  type ItemFormValues,
  type StopFormErrors,
  type StopFormValues,
} from "@/lib/itinerary-rules"
import type { ProblemDetails } from "@/lib/problem-details"
import { useVersionedTripMutation, type Trip, type VersionedTripRequest } from "@/lib/trip-api"

const selectClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

const itemKinds: Array<{ label: string; value: ItemKind }> = [
  { label: "Activity", value: "activity" },
  { label: "Transport", value: "transport" },
  { label: "Stay", value: "stay" },
  { label: "Meal", value: "meal" },
  { label: "Note", value: "note" },
  { label: "Other", value: "other" },
]

function FormProblem({ problem }: { problem?: ProblemDetails | undefined }) {
  if (!problem || problem.errors) return null
  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3" role="alert">
      <p className="font-medium text-destructive">{problem.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{problem.detail}</p>
    </div>
  )
}

function fieldProblem<T extends string>(
  field: T,
  localErrors: Partial<Record<T, string>>,
  problem?: ProblemDetails,
) {
  return localErrors[field] ?? problem?.errors?.[field]?.[0]
}

export function StopEditorDialog({
  insertAfterStopId,
  stop,
  trigger,
  trip,
}: {
  insertAfterStopId?: string | undefined
  stop?: ItineraryStop | undefined
  trigger: ReactElement
  trip: Trip
}) {
  const [open, setOpen] = useState(false)
  const [citySearch, setCitySearch] = useState("")
  const [selectedCityId, setSelectedCityId] = useState(stop?.city.id ?? "")
  const [localErrors, setLocalErrors] = useState<StopFormErrors>({})
  const citiesQuery = useQuery({ ...catalogCityOptionsQueryOptions(), enabled: open })
  const toast = useAppToast()
  const id = useId()
  const request: VersionedTripRequest<CreateStopInput> = stop
    ? updateStopRequest(trip.id, stop.id)
    : createStopRequest(trip.id)
  const mutation = useVersionedTripMutation<CreateStopInput, unknown>({
    tripId: trip.id,
    request,
    onSuccess: () => {
      setOpen(false)
      toast.show({
        title: stop ? "Stop updated" : "Stop added",
        description: stop
          ? `${stop.city.name} now reflects your changes.`
          : "The new Stop is ready for itinerary items.",
      })
    },
  })
  const problem =
    mutation.mutation.isError && !mutation.recovery
      ? problemFromError(mutation.mutation.error)
      : undefined
  const normalizedSearch = citySearch.trim().toLocaleLowerCase()
  const cityOptions = (citiesQuery.data ?? []).filter((city) => {
    if (city.id === selectedCityId) return true
    if (!normalizedSearch) return true
    return `${city.name} ${city.region ?? ""} ${city.country.name} ${city.country.code}`
      .toLocaleLowerCase()
      .includes(normalizedSearch)
  })

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setCitySearch("")
      setSelectedCityId(stop?.city.id ?? "")
      setLocalErrors({})
      mutation.mutation.reset()
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: StopFormValues = {
      cityId: String(data.get("cityId") ?? ""),
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      notes: String(data.get("notes") ?? "").trim(),
    }
    const errors = validateStopForm(values, trip)
    setLocalErrors(errors)
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      ;(event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus()
      return
    }
    mutation.mutation.mutate({
      cityId: values.cityId,
      startDate: values.startDate,
      endDate: values.endDate,
      notes: values.notes || null,
      ...(!stop && insertAfterStopId ? { insertAfterStopId } : {}),
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{stop ? `Edit ${stop.city.name}` : "Add a Stop"}</DialogTitle>
            <DialogDescription>
              Stop dates use an included first day and an excluded departure date.
            </DialogDescription>
          </DialogHeader>
          <form key={`${stop?.id ?? "new"}-${stop?.startDate ?? ""}`} noValidate onSubmit={submit}>
            <div className="grid gap-5 py-2">
              <FormProblem problem={problem} />
              <Field data-invalid={Boolean(fieldProblem("cityId", localErrors, problem))}>
                <FieldLabel htmlFor={`${id}-city-search`}>Search Catalog Cities</FieldLabel>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    className="pl-9"
                    id={`${id}-city-search`}
                    onChange={(event) => setCitySearch(event.target.value)}
                    placeholder="Search by city, region, or country"
                    type="search"
                    value={citySearch}
                  />
                </div>
                <FieldLabel htmlFor={`${id}-city`}>Catalog City</FieldLabel>
                <select
                  aria-invalid={Boolean(fieldProblem("cityId", localErrors, problem))}
                  className={selectClassName}
                  disabled={citiesQuery.isPending}
                  id={`${id}-city`}
                  name="cityId"
                  onChange={(event) => setSelectedCityId(event.target.value)}
                  value={selectedCityId}
                >
                  <option value="">Choose a city</option>
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.country.code} · {city.timezone}
                    </option>
                  ))}
                </select>
                <FieldDescription>
                  The city’s IANA time zone gives local meaning to itinerary dates and times.
                </FieldDescription>
                <FieldError>{fieldProblem("cityId", localErrors, problem)}</FieldError>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldProblem("startDate", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-start-date`}>First day</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("startDate", localErrors, problem))}
                    defaultValue={stop?.startDate ?? trip.startDate}
                    id={`${id}-start-date`}
                    max={previousDate(trip.endDate)}
                    min={trip.startDate}
                    name="startDate"
                    required
                    type="date"
                  />
                  <FieldError>{fieldProblem("startDate", localErrors, problem)}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-end-date`}>Departure date</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}
                    defaultValue={stop?.endDate ?? trip.endDate}
                    id={`${id}-end-date`}
                    max={trip.endDate}
                    min={trip.startDate}
                    name="endDate"
                    required
                    type="date"
                  />
                  <FieldError>{fieldProblem("endDate", localErrors, problem)}</FieldError>
                </Field>
              </div>

              <Field data-invalid={Boolean(fieldProblem("notes", localErrors, problem))}>
                <FieldLabel htmlFor={`${id}-notes`}>Planning notes</FieldLabel>
                <Textarea
                  defaultValue={stop?.notes ?? ""}
                  id={`${id}-notes`}
                  maxLength={20_000}
                  name="notes"
                  rows={3}
                />
                <FieldError>{fieldProblem("notes", localErrors, problem)}</FieldError>
              </Field>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={mutation.mutation.isPending} type="submit">
                {mutation.mutation.isPending ? "Saving Stop…" : stop ? "Save Stop" : "Add Stop"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {mutation.recovery ? <StaleTripRecovery {...mutation.recovery} /> : null}
    </>
  )
}

function initialItemValues(item: ItineraryItem | undefined, stop: ItineraryStop): ItemFormValues {
  return {
    sourceActivityId: item?.sourceActivityId ?? "",
    kind: item?.kind ?? "activity",
    title: item?.title ?? "",
    description: item?.description ?? "",
    scheduledDate: item?.scheduledDate ?? stop.startDate,
    startTime: inputTime(item?.startTime ?? null),
    endDate: item?.endDate ?? "",
    endTime: inputTime(item?.endTime ?? null),
    durationMinutes: item?.durationMinutes?.toString() ?? "",
    estimatedCost: item?.estimatedCost ?? "",
    notes: item?.notes ?? "",
  }
}

function activitySummary(activity: CatalogActivity | undefined) {
  if (!activity) return null
  return (
    <div className="rounded-lg border bg-muted/25 p-3 text-sm">
      <p className="font-medium">{activity.name}</p>
      <p className="mt-1 text-muted-foreground">
        {activity.category.name} · {formatDuration(activity.defaultDurationMinutes)} ·{" "}
        {formatMoney(activity.estimatedCost, activity.currency)} catalog estimate
      </p>
    </div>
  )
}

export function ItemEditorDialog({
  item,
  stop,
  trigger,
  trip,
}: {
  item?: ItineraryItem | undefined
  stop: ItineraryStop
  trigger?: ReactElement | undefined
  trip: Trip
}) {
  const fixedSource = item?.sourceActivityId ? "catalog" : "custom"
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<"catalog" | "custom">(item ? fixedSource : "custom")
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? "activity")
  const [activitySearch, setActivitySearch] = useState("")
  const [selectedActivityId, setSelectedActivityId] = useState(item?.sourceActivityId ?? "")
  const [selectedActivityOption, setSelectedActivityOption] = useState<CatalogActivity>()
  const [localErrors, setLocalErrors] = useState<ItemFormErrors>({})
  const toast = useAppToast()
  const id = useId()
  const activitiesQuery = useInfiniteQuery({
    ...activitiesQueryOptions({
      cityId: stop.city.id,
      ...(activitySearch.trim() ? { q: activitySearch.trim() } : {}),
    }),
    enabled: open && !item && source === "catalog",
  })
  const activityOptions = uniqueById(activitiesQuery.data?.pages ?? [])
  const selectedActivity =
    activityOptions.find((activity) => activity.id === selectedActivityId) ?? selectedActivityOption
  const shownActivityOptions =
    selectedActivity && !activityOptions.some((activity) => activity.id === selectedActivity.id)
      ? [selectedActivity, ...activityOptions]
      : activityOptions
  const request: VersionedTripRequest<CreateItemInput | UpdateItemInput> = (input, headers) =>
    item
      ? updateItemRequest(trip.id, stop.id, item.id)(input as UpdateItemInput, headers)
      : createItemRequest(trip.id, stop.id)(input as CreateItemInput, headers)
  const mutation = useVersionedTripMutation<CreateItemInput | UpdateItemInput, unknown>({
    tripId: trip.id,
    request,
    onSuccess: () => {
      setOpen(false)
      toast.show({
        title: item ? "Itinerary item updated" : "Itinerary item added",
        description: item
          ? `${item.title} now reflects your changes.`
          : `The item was added to ${stop.city.name}.`,
      })
    },
  })
  const problem =
    mutation.mutation.isError && !mutation.recovery
      ? problemFromError(mutation.mutation.error)
      : undefined
  const values = initialItemValues(item, stop)

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSource(item ? fixedSource : "custom")
      setKind(item?.kind ?? "activity")
      setActivitySearch("")
      setSelectedActivityId(item?.sourceActivityId ?? "")
      setSelectedActivityOption(undefined)
      setLocalErrors({})
      mutation.mutation.reset()
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const submitted: ItemFormValues = {
      sourceActivityId: String(data.get("sourceActivityId") ?? ""),
      kind,
      title: String(data.get("title") ?? "").trim(),
      description: String(data.get("description") ?? "").trim(),
      scheduledDate: String(data.get("scheduledDate") ?? ""),
      startTime: String(data.get("startTime") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      endTime: String(data.get("endTime") ?? ""),
      durationMinutes: String(data.get("durationMinutes") ?? ""),
      estimatedCost: String(data.get("estimatedCost") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    }
    const errors = validateItemForm(submitted, stop, item ? "custom" : source)
    setLocalErrors(errors)
    const firstError = Object.keys(errors)[0]
    if (firstError) {
      ;(event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus()
      return
    }

    const common = {
      scheduledDate: submitted.scheduledDate,
      startTime: apiTime(submitted.startTime),
      durationMinutes: submitted.durationMinutes ? Number(submitted.durationMinutes) : null,
      notes: submitted.notes || null,
    }
    if (!item && source === "catalog") {
      mutation.mutation.mutate({
        ...common,
        sourceActivityId: submitted.sourceActivityId,
        ...(submitted.estimatedCost ? { estimatedCost: submitted.estimatedCost } : {}),
      })
      return
    }

    mutation.mutation.mutate({
      ...common,
      kind: submitted.kind,
      title: submitted.title,
      description: submitted.description || null,
      estimatedCost: submitted.estimatedCost,
      ...(submitted.kind === "stay"
        ? { endDate: submitted.endDate, endTime: apiTime(submitted.endTime) }
        : item
          ? { endDate: null, endTime: null }
          : {}),
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button">
              <Plus aria-hidden="true" /> Add item
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{item ? `Edit ${item.title}` : `Add to ${stop.city.name}`}</DialogTitle>
            <DialogDescription>
              Dates and times are kept as local planning values in {stop.city.timezone}.
            </DialogDescription>
          </DialogHeader>
          <form
            key={`${item?.id ?? "new"}-${item?.scheduledDate ?? ""}-${source}`}
            noValidate
            onSubmit={submit}
          >
            <div className="grid gap-5 py-2">
              <FormProblem problem={problem} />
              {!item ? (
                <Field>
                  <FieldLabel htmlFor={`${id}-source`}>Item source</FieldLabel>
                  <select
                    className={selectClassName}
                    id={`${id}-source`}
                    onChange={(event) => {
                      const nextSource = event.target.value as "catalog" | "custom"
                      setSource(nextSource)
                      setKind("activity")
                    }}
                    value={source}
                  >
                    <option value="custom">Custom itinerary item</option>
                    <option value="catalog">Catalog Activity</option>
                  </select>
                </Field>
              ) : item.sourceActivityId ? (
                <div className="rounded-lg border bg-muted/25 p-3 text-sm">
                  <p className="font-medium">
                    Sourced from Catalog Activity #{item.sourceActivityId}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    The fields below are this Trip’s editable snapshot; catalog changes do not
                    overwrite them.
                  </p>
                </div>
              ) : null}

              {!item && source === "catalog" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor={`${id}-activity-search`}>
                      Search Catalog Activities
                    </FieldLabel>
                    <Input
                      id={`${id}-activity-search`}
                      onChange={(event) => setActivitySearch(event.target.value)}
                      placeholder={`Search activities in ${stop.city.name}`}
                      type="search"
                      value={activitySearch}
                    />
                  </Field>
                  <Field
                    data-invalid={Boolean(fieldProblem("sourceActivityId", localErrors, problem))}
                  >
                    <FieldLabel htmlFor={`${id}-activity`}>Catalog Activity</FieldLabel>
                    <select
                      aria-invalid={Boolean(fieldProblem("sourceActivityId", localErrors, problem))}
                      className={selectClassName}
                      disabled={activitiesQuery.isPending}
                      id={`${id}-activity`}
                      name="sourceActivityId"
                      onChange={(event) => {
                        setSelectedActivityId(event.target.value)
                        setSelectedActivityOption(
                          activityOptions.find((activity) => activity.id === event.target.value),
                        )
                      }}
                      value={selectedActivityId}
                    >
                      <option value="">Choose an activity</option>
                      {shownActivityOptions.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name} · {activity.category.name}
                        </option>
                      ))}
                    </select>
                    <FieldError>
                      {fieldProblem("sourceActivityId", localErrors, problem)}
                    </FieldError>
                  </Field>
                  {activitySummary(selectedActivity)}
                </>
              ) : (
                <>
                  <Field data-invalid={Boolean(fieldProblem("kind", localErrors, problem))}>
                    <FieldLabel htmlFor={`${id}-kind`}>Type</FieldLabel>
                    <select
                      className={selectClassName}
                      disabled={Boolean(item?.sourceActivityId)}
                      id={`${id}-kind`}
                      name="kind"
                      onChange={(event) => setKind(event.target.value as ItemKind)}
                      value={kind}
                    >
                      {itemKinds.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <FieldError>{fieldProblem("kind", localErrors, problem)}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(fieldProblem("title", localErrors, problem))}>
                    <FieldLabel htmlFor={`${id}-title`}>Snapshot title</FieldLabel>
                    <Input
                      aria-invalid={Boolean(fieldProblem("title", localErrors, problem))}
                      defaultValue={values.title}
                      id={`${id}-title`}
                      maxLength={500}
                      name="title"
                      required
                    />
                    <FieldError>{fieldProblem("title", localErrors, problem)}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(fieldProblem("description", localErrors, problem))}>
                    <FieldLabel htmlFor={`${id}-description`}>Snapshot description</FieldLabel>
                    <Textarea
                      defaultValue={values.description}
                      id={`${id}-description`}
                      maxLength={20_000}
                      name="description"
                      rows={3}
                    />
                    <FieldError>{fieldProblem("description", localErrors, problem)}</FieldError>
                  </Field>
                </>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(fieldProblem("scheduledDate", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-scheduled-date`}>
                    {kind === "stay" ? "Check-in date" : "Date"}
                  </FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("scheduledDate", localErrors, problem))}
                    defaultValue={values.scheduledDate}
                    id={`${id}-scheduled-date`}
                    max={previousDate(stop.endDate)}
                    min={stop.startDate}
                    name="scheduledDate"
                    required
                    type="date"
                  />
                  <FieldError>{fieldProblem("scheduledDate", localErrors, problem)}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldProblem("startTime", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-start-time`}>
                    {kind === "stay" ? "Check-in time" : "Start time"}
                  </FieldLabel>
                  <Input
                    defaultValue={values.startTime}
                    id={`${id}-start-time`}
                    name="startTime"
                    type="time"
                  />
                  <FieldError>{fieldProblem("startTime", localErrors, problem)}</FieldError>
                </Field>
              </div>

              {kind === "stay" ? (
                <div className="grid gap-5 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                  <Field data-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}>
                    <FieldLabel htmlFor={`${id}-end-date`}>Checkout date</FieldLabel>
                    <Input
                      aria-describedby={`${id}-checkout-help`}
                      aria-invalid={Boolean(fieldProblem("endDate", localErrors, problem))}
                      defaultValue={values.endDate}
                      id={`${id}-end-date`}
                      max={stop.endDate}
                      min={stop.startDate}
                      name="endDate"
                      required
                      type="date"
                    />
                    <FieldDescription id={`${id}-checkout-help`}>
                      Checkout may be on {stop.endDate}, the excluded Stop departure date.
                    </FieldDescription>
                    <FieldError>{fieldProblem("endDate", localErrors, problem)}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(fieldProblem("endTime", localErrors, problem))}>
                    <FieldLabel htmlFor={`${id}-end-time`}>Checkout time</FieldLabel>
                    <Input
                      defaultValue={values.endTime}
                      id={`${id}-end-time`}
                      name="endTime"
                      type="time"
                    />
                    <FieldError>{fieldProblem("endTime", localErrors, problem)}</FieldError>
                  </Field>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  data-invalid={Boolean(fieldProblem("durationMinutes", localErrors, problem))}
                >
                  <FieldLabel htmlFor={`${id}-duration`}>Duration in minutes</FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("durationMinutes", localErrors, problem))}
                    defaultValue={values.durationMinutes}
                    id={`${id}-duration`}
                    min="1"
                    name="durationMinutes"
                    step="1"
                    type="number"
                  />
                  <FieldError>{fieldProblem("durationMinutes", localErrors, problem)}</FieldError>
                </Field>
                <Field data-invalid={Boolean(fieldProblem("estimatedCost", localErrors, problem))}>
                  <FieldLabel htmlFor={`${id}-cost`}>
                    Estimated cost ({trip.baseCurrency})
                  </FieldLabel>
                  <Input
                    aria-invalid={Boolean(fieldProblem("estimatedCost", localErrors, problem))}
                    defaultValue={values.estimatedCost}
                    id={`${id}-cost`}
                    inputMode="decimal"
                    name="estimatedCost"
                    placeholder={source === "catalog" && !item ? "Use catalog estimate" : "0"}
                    required={source === "custom" || Boolean(item)}
                  />
                  {source === "catalog" && !item ? (
                    <FieldDescription>
                      Leave blank to snapshot the catalog estimate or its current conversion.
                    </FieldDescription>
                  ) : null}
                  <FieldError>{fieldProblem("estimatedCost", localErrors, problem)}</FieldError>
                </Field>
              </div>

              <Field data-invalid={Boolean(fieldProblem("notes", localErrors, problem))}>
                <FieldLabel htmlFor={`${id}-notes`}>Planning notes</FieldLabel>
                <Textarea
                  defaultValue={values.notes}
                  id={`${id}-notes`}
                  maxLength={20_000}
                  name="notes"
                  rows={3}
                />
                <FieldError>{fieldProblem("notes", localErrors, problem)}</FieldError>
              </Field>
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={mutation.mutation.isPending} type="submit">
                {mutation.mutation.isPending ? "Saving item…" : item ? "Save item" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {mutation.recovery ? <StaleTripRecovery {...mutation.recovery} /> : null}
    </>
  )
}
