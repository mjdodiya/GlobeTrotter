import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { Check, Copy, Link2, LogOut, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react"
import { useRef, useState, type FormEvent } from "react"

import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { problemFromError } from "@/components/foundation/problem-state"
import { StaleTripRecovery } from "@/components/foundation/stale-trip-recovery"
import { useAppToast } from "@/components/foundation/toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { queryKeys } from "@/lib/query-keys"
import type { AppSession } from "@/lib/session"
import {
  addMemberRequest,
  changeMemberRoleRequest,
  createShareLinkRequest,
  leaveTrip,
  removeMemberRequest,
  revokeShareLinkRequest,
  tripMembersQueryOptions,
  tripShareLinksQueryOptions,
  type CreatedShareLink,
  type MemberRole,
} from "@/lib/sharing-api"
import { useVersionedTripMutation, type Trip } from "@/lib/trip-api"

function InlineProblem({ error }: { error: Error | null }) {
  if (!error) return null
  const problem = problemFromError(error)
  return (
    <p className="text-sm text-destructive" role="alert">
      {problem.title}: {problem.detail}
    </p>
  )
}

function formatInstant(value: string | null): string {
  if (!value) return "time unavailable"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function linkState(link: { expiresAt: string | null; revokedAt: string | null }) {
  if (link.revokedAt) return { label: "Revoked", active: false }
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return { label: "Expired", active: false }
  }
  return { label: "Active", active: true }
}

function CreatedLink({ link }: { link: CreatedShareLink }) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState("")

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable")
      await navigator.clipboard.writeText(link.url)
      setStatus("Share Link copied to the clipboard.")
    } catch {
      input.current?.focus()
      input.current?.select()
      setStatus("The Share Link is selected. Press Ctrl+C or Command+C to copy it.")
    }
  }

  return (
    <Alert className="mt-4 border-emerald-500/30 bg-emerald-500/5">
      <Check aria-hidden="true" />
      <AlertTitle>Share Link created</AlertTitle>
      <AlertDescription>
        <p>
          Copy it now. For security, this address is shown only once and is not saved in the app.
        </p>
        <label className="mt-3 block font-medium text-foreground" htmlFor="created-share-link">
          New Share Link
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <Input
            id="created-share-link"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            ref={input}
            value={link.url}
          />
          <Button onClick={() => void copyLink()} type="button" variant="outline">
            <Copy aria-hidden="true" /> Copy link
          </Button>
        </div>
        <p aria-live="polite" className="mt-2 min-h-5 text-xs" role="status">
          {status}
        </p>
      </AlertDescription>
    </Alert>
  )
}

export function TripCollaboration({ session, trip }: { session: AppSession; trip: Trip }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useAppToast()
  const addMemberForm = useRef<HTMLFormElement>(null)
  const shareLinkForm = useRef<HTMLFormElement>(null)
  const [createdLink, setCreatedLink] = useState<CreatedShareLink | null>(null)
  const members = useQuery(tripMembersQueryOptions(trip.id))
  const shareLinks = useQuery({
    ...tripShareLinksQueryOptions(trip.id),
    enabled: trip.access.canManageShareLinks,
  })
  const addMember = useVersionedTripMutation<{ email: string; role: MemberRole }, unknown>({
    tripId: trip.id,
    request: addMemberRequest(trip.id),
    onSuccess: () => {
      addMemberForm.current?.reset()
      toast.show({ title: "Member added", description: "Their Trip access starts immediately." })
    },
  })
  const changeRole = useVersionedTripMutation<{ role: MemberRole; userId: string }, unknown>({
    tripId: trip.id,
    request: changeMemberRoleRequest(trip.id),
    onSuccess: () => {
      toast.show({ title: "Member role updated", description: "The new permissions now apply." })
    },
  })
  const removeMember = useVersionedTripMutation<{ userId: string }, undefined>({
    tripId: trip.id,
    request: removeMemberRequest(trip.id),
    onSuccess: () => {
      toast.show({ title: "Member removed", description: "Their access ended immediately." })
    },
  })
  const createLink = useVersionedTripMutation<{ expiresAt: string | null }, CreatedShareLink>({
    tripId: trip.id,
    request: createShareLinkRequest(trip.id),
    onSuccess: ({ data }) => {
      setCreatedLink(data)
      shareLinkForm.current?.reset()
    },
  })
  const revokeLink = useVersionedTripMutation<{ shareLinkId: string }, undefined>({
    tripId: trip.id,
    request: revokeShareLinkRequest(trip.id),
    onSuccess: () => {
      toast.show({ title: "Share Link revoked", description: "The link no longer opens the Trip." })
    },
  })
  const leave = useMutation({
    mutationFn: () => leaveTrip(trip.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.trip(trip.id) })
      await Promise.all([
        queryClient.invalidateQueries({ exact: true, queryKey: queryKeys.dashboard() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tripLists() }),
      ])
      toast.show({ title: "You left the Trip", description: "Your access has ended." })
      await navigate({ to: "/trips" })
    },
  })

  function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    addMember.mutation.mutate({
      email: String(data.get("email") ?? "").trim(),
      role: data.get("role") === "editor" ? "editor" : "viewer",
    })
  }

  function submitShareLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const localExpiration = String(data.get("expiresAt") ?? "").trim()
    createLink.mutation.mutate({
      expiresAt: localExpiration ? new Date(localExpiration).toISOString() : null,
    })
  }

  const memberError =
    (addMember.mutation.isError && !addMember.recovery ? addMember.mutation.error : null) ??
    (changeRole.mutation.isError && !changeRole.recovery ? changeRole.mutation.error : null) ??
    (removeMember.mutation.isError && !removeMember.recovery ? removeMember.mutation.error : null)
  const shareError =
    (createLink.mutation.isError && !createLink.recovery ? createLink.mutation.error : null) ??
    (revokeLink.mutation.isError && !revokeLink.recovery ? revokeLink.mutation.error : null)

  return (
    <section aria-labelledby="sharing-heading" className="space-y-5">
      <header className="space-y-1">
        <h2 id="sharing-heading" className="text-2xl font-semibold">
          Sharing and collaboration
        </h2>
        <p className="text-sm text-muted-foreground">
          Membership, Share Links, and public publication grant separate kinds of access.
        </p>
      </header>

      {trip.access.canManageMembers ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" aria-hidden="true" /> Publication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This Trip is <strong className="text-foreground">{trip.visibility}</strong>. Public
              publication creates a read-only page and never exposes the Budget Limit or private
              Stop, item, or Travel Leg notes.
            </p>
            {!session.user.emailVerified ? (
              <Alert>
                <ShieldCheck aria-hidden="true" />
                <AlertTitle>Verify your email before publishing</AlertTitle>
                <AlertDescription>
                  Direct collaboration also requires verified accounts. Visit Account settings to
                  resend verification guidance.
                </AlertDescription>
              </Alert>
            ) : null}
            <Button asChild variant="outline">
              <a href="#edit-trip-heading">Change publication in Trip details</a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" aria-hidden="true" /> Trip Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {trip.access.canManageMembers ? (
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
              onSubmit={submitMember}
              ref={addMemberForm}
            >
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="member-email">
                  Verified account email
                </label>
                <Input
                  autoComplete="email"
                  disabled={addMember.mutation.isPending || !session.user.emailVerified}
                  id="member-email"
                  name="email"
                  placeholder="traveler@example.com"
                  required
                  type="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="member-role">
                  Role
                </label>
                <select
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                  defaultValue="viewer"
                  disabled={addMember.mutation.isPending || !session.user.emailVerified}
                  id="member-role"
                  name="role"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <Button
                className="self-end"
                disabled={addMember.mutation.isPending || !session.user.emailVerified}
                type="submit"
              >
                <UserPlus aria-hidden="true" /> Add member
              </Button>
              {!session.user.emailVerified ? (
                <p className="text-sm text-muted-foreground sm:col-span-3">
                  Verify your email in <Link to="/account">Account settings</Link> before adding
                  members. The invited traveler must also have a verified account.
                </p>
              ) : null}
            </form>
          ) : null}

          {members.isPending ? (
            <p className="text-sm text-muted-foreground">Loading Trip Members…</p>
          ) : members.isError ? (
            <InlineProblem error={members.error} />
          ) : members.data.data.length ? (
            <ul className="divide-y rounded-xl border">
              {members.data.data.map((member) => (
                <li
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={member.user.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatInstant(member.createdAt)}
                    </p>
                  </div>
                  {trip.access.canManageMembers ? (
                    <div className="flex items-center gap-2">
                      <label className="sr-only" htmlFor={`role-${member.user.id}`}>
                        Role for {member.user.name}
                      </label>
                      <select
                        className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                        disabled={changeRole.mutation.isPending || removeMember.mutation.isPending}
                        id={`role-${member.user.id}`}
                        onChange={(event) =>
                          changeRole.mutation.mutate({
                            role: event.currentTarget.value as MemberRole,
                            userId: member.user.id,
                          })
                        }
                        value={member.role}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <DestructiveConfirmation
                        confirmLabel={`Remove ${member.user.name}`}
                        description={`${member.user.name} will immediately lose access to this Trip.`}
                        onConfirm={() => removeMember.mutation.mutate({ userId: member.user.id })}
                        title={`Remove ${member.user.name}?`}
                        trigger={
                          <Button
                            aria-label={`Remove ${member.user.name}`}
                            disabled={removeMember.mutation.isPending}
                            size="icon-sm"
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <Badge variant="outline">
                      {member.role === "editor" ? "Editor" : "Viewer"}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No direct members yet.
            </p>
          )}
          <InlineProblem error={memberError} />

          {trip.access.level !== "owner" ? (
            <div className="border-t pt-5">
              <DestructiveConfirmation
                confirmLabel="Leave Trip"
                description="Your access ends immediately. You will need the owner to add you again before you can reopen this Trip."
                onConfirm={() => leave.mutate()}
                title={`Leave ${trip.name}?`}
                trigger={
                  <Button disabled={leave.isPending} type="button" variant="destructive">
                    <LogOut aria-hidden="true" /> Leave Trip
                  </Button>
                }
              />
              <InlineProblem error={leave.isError ? leave.error : null} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {trip.access.canManageShareLinks ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-5" aria-hidden="true" /> Share Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Anyone with an active Share Link can read the privacy-safe itinerary. Links never
              grant editing access and can be revoked at any time.
            </p>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={submitShareLink}
              ref={shareLinkForm}
            >
              <div className="w-full max-w-sm">
                <label className="mb-1 block text-sm font-medium" htmlFor="share-link-expiration">
                  Optional expiration
                </label>
                <Input
                  disabled={createLink.mutation.isPending}
                  id="share-link-expiration"
                  name="expiresAt"
                  type="datetime-local"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank for a link that remains active until revoked.
                </p>
              </div>
              <Button disabled={createLink.mutation.isPending} type="submit">
                <Link2 aria-hidden="true" />
                {createLink.mutation.isPending ? "Creating…" : "Create Share Link"}
              </Button>
            </form>
            {createdLink ? <CreatedLink link={createdLink} /> : null}
            <InlineProblem error={shareError} />

            {shareLinks.isPending ? (
              <p className="text-sm text-muted-foreground">Loading Share Links…</p>
            ) : shareLinks.isError ? (
              <InlineProblem error={shareLinks.error} />
            ) : shareLinks.data.data.length ? (
              <ul className="divide-y rounded-xl border">
                {shareLinks.data.data.map((link) => {
                  const state = linkState(link)
                  return (
                    <li
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={link.id}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={state.active ? "secondary" : "outline"}>
                            {state.label}
                          </Badge>
                          <span className="text-sm">Created {formatInstant(link.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {link.expiresAt
                            ? `Expires ${formatInstant(link.expiresAt)}`
                            : "No expiration"}
                        </p>
                      </div>
                      {state.active ? (
                        <DestructiveConfirmation
                          confirmLabel="Revoke Share Link"
                          description="Anyone using this Share Link will immediately lose access. This cannot be undone."
                          onConfirm={() => {
                            if (createdLink?.id === link.id) setCreatedLink(null)
                            revokeLink.mutation.mutate({ shareLinkId: link.id })
                          }}
                          title="Revoke this Share Link?"
                          trigger={
                            <Button
                              disabled={revokeLink.mutation.isPending}
                              type="button"
                              variant="destructive"
                            >
                              <Trash2 aria-hidden="true" /> Revoke
                            </Button>
                          }
                        />
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No Share Links have been created.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {addMember.recovery ? <StaleTripRecovery {...addMember.recovery} /> : null}
      {changeRole.recovery ? <StaleTripRecovery {...changeRole.recovery} /> : null}
      {removeMember.recovery ? <StaleTripRecovery {...removeMember.recovery} /> : null}
      {createLink.recovery ? <StaleTripRecovery {...createLink.recovery} /> : null}
      {revokeLink.recovery ? <StaleTripRecovery {...revokeLink.recovery} /> : null}
    </section>
  )
}
