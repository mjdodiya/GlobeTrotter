import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { ProblemState, problemFromError } from "@/components/foundation/problem-state"
import { RouteLoadingState } from "@/components/foundation/route-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api"
import { requireVersionedResponseData } from "@/lib/http"
import { tripItineraryQueryOptions, tripQueryOptions, useVersionedTripMutation } from "@/lib/trip-api"

export const Route = createFileRoute("/_authenticated/trips/$tripId")({ component: TripDetailPage })

const modes = ["flight", "train", "bus", "car", "ferry", "walk", "other"] as const
type LegForm = {
  fromStopId: string
  toStopId: string
  mode: (typeof modes)[number]
  title: string
  provider: string
  reference: string
  departureAt: string
  arrivalAt: string
  estimatedCost: string
  notes: string
}

const emptyLeg: LegForm = { fromStopId: "", toStopId: "", mode: "flight", title: "", provider: "", reference: "", departureAt: "", arrivalAt: "", estimatedCost: "0", notes: "" }

function formatInstant(value: string, timezone: string) {
  return `${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value))} (${timezone})`
}

function toInputDate(value: string) { return value ? value.slice(0, 16) : "" }

function instantToInputDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function zonedDateTimeToIso(value: string, timezone: string) {
  if (!value) return value
  const [date, time] = value.split("T")
  const [year, month, day] = date!.split("-").map(Number)
  const [hour, minute] = time!.split(":").map(Number)
  const utcGuess = Date.UTC(year!, month! - 1, day, hour, minute)
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utcGuess))
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
  const offset = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute) - utcGuess
  return new Date(utcGuess - offset).toISOString()
}

function zonedDateTimeToIso(value: string, timezone: string) {
  if (!value) return value
  const [date, time] = value.split("T")
  const [year, month, day] = date!.split("-").map(Number)
  const [hour, minute] = time!.split(":").map(Number)
  const utcGuess = Date.UTC(year!, month! - 1, day, hour, minute)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcGuess))
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
  const offset = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute) - utcGuess
  return new Date(utcGuess - offset).toISOString()
}

function TripDetailPage() {
  const { tripId } = Route.useParams()
  const tripQuery = useQuery(tripQueryOptions(tripId))
  const itineraryQuery = useQuery(tripItineraryQueryOptions(tripId))
  if (tripQuery.isPending || itineraryQuery.isPending) return <RouteLoadingState label="Loading Trip" />
  if (tripQuery.isError || itineraryQuery.isError) {
    const error = tripQuery.error ?? itineraryQuery.error
    return <ProblemState problem={problemFromError(error)} onRetry={() => void Promise.all([tripQuery.refetch(), itineraryQuery.refetch()])} />
  }
  return <TripEditor tripId={tripId} trip={tripQuery.data.data} itinerary={itineraryQuery.data.data} />
}

function TripEditor({ tripId, trip, itinerary }: { tripId: string; trip: any; itinerary: any }) {
  const [form, setForm] = useState<LegForm>({ ...emptyLeg, fromStopId: itinerary.stops[0]?.id ?? "", toStopId: itinerary.stops[1]?.id ?? "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [order, setOrder] = useState<string[]>(() => itinerary.stops.map((stop: any) => stop.id))
  const [preview, setPreview] = useState<any>(null)
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState("")

  useEffect(() => { setOrder(itinerary.stops.map((stop: any) => stop.id)) }, [itinerary.stops])

  const legMutation = useVersionedTripMutation({
    tripId,
    request: async (input: LegForm & { id?: string; remove?: boolean }, headers) => {
      const { id, remove, ...fields } = input
      if (remove && id) return apiClient.api.v1.trips[":tripId"].legs[":legId"].$delete({ param: { tripId, legId: id } }, { headers })
      const fromStop = itinerary.stops.find((stop: any) => stop.id === fields.fromStopId)
      const toStop = itinerary.stops.find((stop: any) => stop.id === fields.toStopId)
      const json = { fromStopId: fields.fromStopId, toStopId: fields.toStopId, mode: fields.mode, title: fields.title, provider: fields.provider || null, reference: fields.reference || null, departureAt: zonedDateTimeToIso(fields.departureAt, fromStop?.city.timezone ?? "UTC"), arrivalAt: zonedDateTimeToIso(fields.arrivalAt, toStop?.city.timezone ?? "UTC"), estimatedCost: fields.estimatedCost, notes: fields.notes || null }
      if (id) return apiClient.api.v1.trips[":tripId"].legs[":legId"].$patch({ param: { tripId, legId: id }, json }, { headers })
      return apiClient.api.v1.trips[":tripId"].legs.$post({ param: { tripId }, json }, { headers })
    },
  })
  const reorderMutation = useVersionedTripMutation({
    tripId,
    request: (input: { stopIds: string[]; removeLegIds: string[] }, headers) => apiClient.api.v1.trips[":tripId"].stops.order.$put({ param: { tripId }, json: input }, { headers }),
  })

  function moveStop(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= order.length) return
    const next = [...order]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    setOrder(next); setPreview(null); setSelectedRemovals([])
    setAnnouncement(`Stop moved to position ${target + 1}. Preview the route before committing.`)
  }

  async function previewOrder() {
    const response = await apiClient.api.v1.trips[":tripId"].stops.order.preview.$post({ param: { tripId }, json: { stopIds: order } })
    const result = await requireVersionedResponseData<any>(response)
    setPreview(result.data); setSelectedRemovals(result.data.affectedLegIds)
    setAnnouncement(`Preview ready. ${result.data.affectedLegIds.length} Travel Leg(s) are affected.`)
  }

  const stopsById = new Map(itinerary.stops.map((stop: any) => [stop.id, stop]))
  const displayedStops = order.map((id) => stopsById.get(id)).filter(Boolean)
  const recovery = reorderMutation.recovery ?? legMutation.recovery

  return <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
    <Button asChild variant="ghost"><Link to="/trips"><ArrowLeft aria-hidden="true" /> My Trips</Link></Button>
    <header className="space-y-2"><p className="text-sm font-semibold text-muted-foreground">{trip.status}</p><h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold">{trip.name}</h1><p className="text-muted-foreground">{trip.startDate} to {trip.endDate}</p></header>
    <section aria-labelledby="route-heading" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="route-heading" className="text-2xl font-semibold">Route order</h2><Button onClick={() => void previewOrder()} disabled={reorderMutation.mutation.isPending}><RefreshCw aria-hidden="true" /> Preview changes</Button></div>
      <ol className="grid gap-3">{displayedStops.map((stop: any, index) => <li className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4" key={stop.id}><div><p className="text-xs font-semibold text-muted-foreground">Stop {index + 1}</p><p className="font-semibold">{stop.city.name}</p><p className="text-sm text-muted-foreground">{stop.startDate} to {stop.endDate}</p></div><div className="flex gap-1"><Button size="icon" variant="outline" aria-label={`Move ${stop.city.name} up`} disabled={index === 0} onClick={() => moveStop(index, -1)}><ArrowUp aria-hidden="true" /></Button><Button size="icon" variant="outline" aria-label={`Move ${stop.city.name} down`} disabled={index === displayedStops.length - 1} onClick={() => moveStop(index, 1)}><ArrowDown aria-hidden="true" /></Button></div></li>)}</ol>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {preview ? <ReorderPreview preview={preview} itinerary={itinerary} selected={selectedRemovals} setSelected={setSelectedRemovals} onCommit={() => { reorderMutation.mutation.mutate({ stopIds: order, removeLegIds: selectedRemovals }); setPreview(null) }} /> : null}
    </section>
    <section aria-labelledby="legs-heading" className="space-y-4"><div className="flex items-center justify-between"><h2 id="legs-heading" className="text-2xl font-semibold">Travel Legs</h2><Button onClick={() => { setEditingId(null); setForm({ ...emptyLeg, fromStopId: order[0] ?? "", toStopId: order[1] ?? "" }) }}><Plus aria-hidden="true" /> Add Travel Leg</Button></div><LegFormView form={form} setForm={setForm} stops={itinerary.stops} onSubmit={() => { legMutation.mutation.mutate({ ...form, id: editingId ?? undefined }); setEditingId(null); setForm(emptyLeg) }} pending={legMutation.mutation.isPending} /><div className="grid gap-4 md:grid-cols-2">{itinerary.legs.map((leg: any) => <LegCard key={leg.id} leg={leg} stopsById={stopsById} onEdit={() => { setEditingId(leg.id); setForm({ ...leg, provider: leg.provider ?? "", reference: leg.reference ?? "", notes: leg.notes ?? "", departureAt: toInputDate(leg.departureAt), arrivalAt: toInputDate(leg.arrivalAt) }) }} onDelete={() => legMutation.mutation.mutate({ ...emptyLeg, id: leg.id, remove: true })} />)}</div></section>
    {recovery ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"><span>{recovery.problem.detail}</span><Button variant="outline" onClick={() => { recovery.onCancel(); setPreview(null); void recovery.onRefresh() }}>Reload and preview again</Button></div> : null}
  </main>
}

function ReorderPreview({ preview, itinerary, selected, setSelected, onCommit }: any) { const legs = itinerary.legs.filter((leg: any) => preview.affectedLegIds.includes(leg.id)); return <div className="space-y-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-5"><h3 className="font-semibold">Review route consequences</h3><p className="text-sm">Stop durations follow each Stop. Route-position gaps remain visible in the preview.</p><ul className="space-y-2 text-sm">{preview.stops.map((stop: any) => <li key={stop.id}>{itinerary.stops.find((item: any) => item.id === stop.id)?.city.name}: {stop.startDate} to {stop.endDate}</li>)}</ul>{legs.length ? <fieldset className="space-y-2"><legend className="font-semibold">Travel Legs that must be removed</legend>{legs.map((leg: any) => <label className="flex gap-2 text-sm" key={leg.id}><input type="checkbox" checked={selected.includes(leg.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, leg.id] : selected.filter((id: string) => id !== leg.id))} />{leg.title}</label>)}</fieldset> : <p className="text-sm">No Travel Legs are affected.</p>}<Button disabled={selected.length !== legs.length} onClick={onCommit}>Confirm route and removals</Button></div> }

function LegCard({ leg, stopsById, onEdit, onDelete }: any) { return <article className="rounded-xl border bg-card p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">{leg.mode}</p><h3 className="font-semibold">{leg.title}</h3></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button><Button size="icon-sm" variant="destructive" aria-label={`Delete ${leg.title}`} onClick={onDelete}><Trash2 aria-hidden="true" /></Button></div></div><p className="mt-3 text-sm">{stopsById.get(leg.fromStopId)?.city.name} to {stopsById.get(leg.toStopId)?.city.name}</p><p className="mt-2 text-sm text-muted-foreground">Departure: {formatInstant(leg.departureAt, leg.departureTimezone)}</p><p className="text-sm text-muted-foreground">Arrival: {formatInstant(leg.arrivalAt, leg.arrivalTimezone)}</p><p className="mt-2 text-sm">{leg.estimatedCost} estimated</p></article> }

function LegFormView({ form, setForm, stops, onSubmit, pending }: any) { const update = (key: string, value: string) => setForm({ ...form, [key]: value }); return <form className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (form.fromStopId === form.toStopId || (form.departureAt && form.arrivalAt && new Date(form.arrivalAt) <= new Date(form.departureAt))) return; onSubmit() }}><Input aria-label="Travel Leg title" placeholder="Title" required value={form.title} onChange={(event) => update("title", event.target.value)} /><select aria-label="Transport mode" className="h-8 rounded-lg border bg-background px-2" value={form.mode} onChange={(event) => update("mode", event.target.value)}>{modes.map((mode) => <option key={mode}>{mode}</option>)}</select><select aria-label="Departure Stop" className="h-8 rounded-lg border bg-background px-2" value={form.fromStopId} onChange={(event) => update("fromStopId", event.target.value)}>{stops.map((stop: any) => <option key={stop.id} value={stop.id}>{stop.city.name}</option>)}</select><select aria-label="Arrival Stop" className="h-8 rounded-lg border bg-background px-2" value={form.toStopId} onChange={(event) => update("toStopId", event.target.value)}>{stops.map((stop: any) => <option key={stop.id} value={stop.id}>{stop.city.name}</option>)}</select><Input aria-label="Departure" type="datetime-local" required value={form.departureAt} onChange={(event) => update("departureAt", event.target.value)} /><Input aria-label="Arrival" type="datetime-local" required value={form.arrivalAt} onChange={(event) => update("arrivalAt", event.target.value)} /><Input aria-label="Provider" placeholder="Provider" value={form.provider} onChange={(event) => update("provider", event.target.value)} /><Input aria-label="Reference" placeholder="Reference" value={form.reference} onChange={(event) => update("reference", event.target.value)} /><Input aria-label="Estimated cost" type="number" min="0" step="0.0001" required value={form.estimatedCost} onChange={(event) => update("estimatedCost", event.target.value)} /><Textarea aria-label="Private notes" placeholder="Private notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} /><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Travel Leg"}</Button></form> }
