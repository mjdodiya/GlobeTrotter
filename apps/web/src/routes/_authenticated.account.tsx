import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { AlertTriangle, Check, Download, ExternalLink, LoaderCircle, Trash2 } from "lucide-react"
import { useState, type FormEvent } from "react"

import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { useAppToast } from "@/components/foundation/toast"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  accountQueryOptions,
  deletionImpactQueryOptions,
  downloadAccountCalendar,
  downloadAccountExport,
  removeSavedCity,
  savedCitiesQueryOptions,
  updateAccount,
} from "@/lib/account-api"
import { authClient } from "@/lib/auth-client"
import { queryKeys } from "@/lib/query-keys"

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountFoundationPage,
})

function AccountFoundationPage() {
  const { session } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const toast = useAppToast()
  const account = useQuery(accountQueryOptions())
  const savedCities = useInfiniteQuery(savedCitiesQueryOptions())
  const impact = useQuery(deletionImpactQueryOptions())
  const [email, setEmail] = useState("")
  const [emailState, setEmailState] = useState<string>()
  const profile = account.data
  const invalidateAccount = () => {
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "me"] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.session() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() })
  }
  const saveProfile = useMutation({
    mutationFn: updateAccount,
    onSuccess: () => {
      invalidateAccount()
      toast.show({ title: "Profile updated", description: "Your preferences are saved." })
    },
    onError: (error) =>
      toast.show({
        title: "Could not save profile",
        description: error.message,
        variant: "destructive",
      }),
  })
  const removeCity = useMutation({
    mutationFn: removeSavedCity,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.savedCities() }),
  })

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    await saveProfile.mutateAsync({
      name: String(values.get("name") ?? "").trim(),
      locale: String(values.get("locale") ?? "en"),
      defaultCurrency: String(values.get("currency") ?? "USD"),
    })
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailState(undefined)
    const result = await authClient.changeEmail({
      newEmail: email.trim(),
      callbackURL: `${window.location.origin}/account`,
    })
    if (result.error) setEmailState(result.error.message ?? "We could not start email change.")
    else setEmailState("Verification sent. Check the new address to complete the change.")
  }

  async function deleteAccount() {
    const result = await authClient.deleteUser({ callbackURL: `${window.location.origin}/` })
    if (result.error) {
      toast.show({
        title: "Deletion failed",
        description: result.error.message ?? "Try again.",
        variant: "destructive",
      })
      return
    }
    toast.show({
      title: "Deletion requested",
      description: "Check your email to confirm permanent deletion.",
    })
  }

  return (
    <div className="min-w-0 space-y-6">
      <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
        Account settings
      </h1>
      <p className="break-words text-muted-foreground">
        Manage your identity, planning defaults, and personal data.
      </p>
      <section className="max-w-3xl space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Profile and preferences</h2>
          <p className="text-sm text-muted-foreground">
            Preferences affect new planning defaults only. Existing Trip costs keep their recorded
            currency.
          </p>
        </div>
        <form onSubmit={submitProfile} className="space-y-4">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={profile?.name ?? session.user.name ?? ""}
                required
              />
            </Field>
            <Field>
              <FieldLabel>Current email</FieldLabel>
              <Input
                value={profile?.email ?? session.user.email}
                readOnly
                aria-describedby="email-status"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="locale">Locale</FieldLabel>
              <Input id="locale" name="locale" defaultValue={profile?.locale ?? "en"} />
            </Field>
            <Field>
              <FieldLabel>Default currency</FieldLabel>
              <Select name="currency" defaultValue={profile?.defaultCurrency ?? "USD"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <p id="email-status" className="flex items-center gap-2 text-sm text-muted-foreground">
            {profile?.emailVerified ? (
              <>
                <Check className="size-4 text-emerald-600" /> Email verified
              </>
            ) : (
              <>
                Email verification required for publishing and direct collaboration.{" "}
                <a
                  className="underline"
                  href={`/verify-email?email=${encodeURIComponent(profile?.email ?? session.user.email)}`}
                >
                  Send verification
                </a>
              </>
            )}
          </p>
          <Button type="submit" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? <LoaderCircle className="animate-spin" /> : null}Save
            preferences
          </Button>
        </form>
      </section>
      <section className="max-w-3xl space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Change email</h2>
          <p className="text-sm text-muted-foreground">
            A verification link will be sent to the new address. Your current email remains active
            until it is verified.
          </p>
        </div>
        <form
          onSubmit={requestEmailChange}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Field className="flex-1">
            <FieldLabel htmlFor="new-email">New email</FieldLabel>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Button type="submit">Request change</Button>
        </form>
        {emailState ? (
          <p role="status" className="text-sm text-muted-foreground">
            {emailState}
          </p>
        ) : null}
      </section>
      <section className="max-w-3xl space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Saved Cities</h2>
          <p className="text-sm text-muted-foreground">Keep a shortlist of places to explore.</p>
        </div>
        {savedCities.isLoading ? (
          <p>Loading saved cities…</p>
        ) : savedCities.data?.pages.flatMap((page) => page.data).length ? (
          <div className="divide-y rounded-lg border">
            {savedCities.data.pages
              .flatMap((page) => page.data)
              .map((city) => (
                <div key={city.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{city.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {city.country.name}
                      {city.region ? ` · ${city.region}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {city.id ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={`Explore ${city.name}`}
                      >
                        <a href={`/cities/${city.id}`}>
                          <ExternalLink />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${city.name}`}
                      onClick={() => city.id && removeCity.mutate(city.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No saved cities yet. Discover a city and save it for later.
          </p>
        )}
        {savedCities.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void savedCities.fetchNextPage()}
            disabled={savedCities.isFetchingNextPage}
          >
            {savedCities.isFetchingNextPage ? <LoaderCircle className="animate-spin" /> : null}Load
            more
          </Button>
        ) : null}
      </section>
      <section className="max-w-3xl space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-semibold">Your data</h2>
          <p className="text-sm text-muted-foreground">
            Download a portable copy of your profile, saved cities, and owned Trips, or add
            accessible itinerary items to your calendar.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => void downloadAccountExport()}>
            <Download />
            Download JSON export
          </Button>
          <Button type="button" variant="outline" onClick={() => void downloadAccountCalendar()}>
            <Download />
            Download calendar
          </Button>
        </div>
      </section>
      <section className="max-w-3xl space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-destructive">
            <AlertTriangle className="size-4" />
            Delete account
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanent deletion is irreversible. It removes your owned Trips and planning records,
            revokes Share Links, removes memberships and Saved Cities, and ends collaborator access.
          </p>
        </div>
        {impact.data ? (
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {Object.entries(impact.data).map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground capitalize">
                  {label.replaceAll(/([A-Z])/g, " $1")}
                </dt>
                <dd className="text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Loading deletion impact…</p>
        )}
        <DestructiveConfirmation
          title="Request permanent account deletion?"
          description="You will receive a confirmation email. This cannot be undone, and signing out does not delete your account."
          confirmLabel="Send deletion email"
          onConfirm={() => void deleteAccount()}
          trigger={
            <Button type="button" variant="destructive">
              <Trash2 />
              Request permanent deletion
            </Button>
          }
        />
      </section>
    </div>
  )
}
