import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { CalendarDays, CheckCircle2, Download, LoaderCircle, MapPin, Trash2 } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

import { FocusedStatus, emailValidationMessage } from "@/components/auth/auth-form"
import { DestructiveConfirmation } from "@/components/foundation/destructive-confirmation"
import { problemFromError, ProblemState } from "@/components/foundation/problem-state"
import { useAppToast } from "@/components/foundation/toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  deletionImpactQueryOptions,
  downloadAccountData,
  invalidateAccountDefaults,
  removeSavedCity,
  savedCitiesQueryOptions,
  updateAccountProfile,
  type AccountProfile,
} from "@/lib/account-api"
import { authClient } from "@/lib/auth-client"
import { recoveryError } from "@/lib/auth-errors"
import { queryKeys } from "@/lib/query-keys"
import { expireSession, refreshSession } from "@/lib/session"
import { absoluteApplicationUrl } from "@/lib/session-routing"

const localeOptions = [
  ["en", "English"],
  ["en-IN", "English (India)"],
  ["es", "Español"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["hi", "हिन्दी"],
  ["ja", "日本語"],
] as const

const currencyOptions = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "SGD"] as const

export function ProfilePreferences({ profile }: { profile: AccountProfile }) {
  const queryClient = useQueryClient()
  const toast = useAppToast()
  const [locale, setLocale] = useState(profile.locale)
  const [currency, setCurrency] = useState(profile.defaultCurrency)
  const mutation = useMutation({
    mutationFn: updateAccountProfile,
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.profile(), updated)
      await invalidateAccountDefaults(queryClient)
      toast.show({
        title: "Settings saved",
        description: "Your future planning defaults are updated.",
      })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") ?? "").trim()
    if (!name) return
    mutation.mutate({ name, locale, defaultCurrency: currency })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile and preferences</CardTitle>
        <CardDescription>
          Used for your account and as defaults when you create new plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          <Field>
            <FieldLabel htmlFor="account-name">Name</FieldLabel>
            <Input
              id="account-name"
              maxLength={500}
              name="name"
              defaultValue={profile.name}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="account-locale">Language and locale</FieldLabel>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="account-locale" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!localeOptions.some(([value]) => value === locale) ? (
                    <SelectItem value={locale}>{locale}</SelectItem>
                  ) : null}
                  {localeOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="account-currency">Default currency</FieldLabel>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="account-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!currencyOptions.some((value) => value === currency) ? (
                    <SelectItem value={currency}>{currency}</SelectItem>
                  ) : null}
                  {currencyOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                This starts new Trips in {currency}. Existing Trip Base Currency and costs never
                change.
              </FieldDescription>
            </Field>
          </div>
          {mutation.isError ? (
            <FieldError>{problemFromError(mutation.error).detail}</FieldError>
          ) : null}
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Saving…" : "Save profile and preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function EmailSettings({
  profile,
  state,
}: {
  profile: AccountProfile
  state: { emailChange?: "complete"; error?: string }
}) {
  const queryClient = useQueryClient()
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const callbackURL = absoluteApplicationUrl("/account?emailChange=complete")

  useEffect(() => {
    if (!state.emailChange || state.error) return
    void refreshSession(queryClient).finally(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
    })
  }, [queryClient, state.emailChange, state.error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const nextEmail = String(new FormData(form).get("newEmail") ?? "").trim()
    const validation = emailValidationMessage(nextEmail)
    if (validation) {
      setError(validation)
      return
    }
    setPending(true)
    setError(undefined)
    const result = await authClient.changeEmail({ newEmail: nextEmail, callbackURL })
    setPending(false)
    if (result.error) {
      setError(recoveryError(result.error, "We couldn’t start the email change. Try again."))
      return
    }
    form.reset()
    setSent(true)
  }

  const callbackFailed = Boolean(state.error)
  const expired = state.error?.toLowerCase().includes("expir")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email address</CardTitle>
        <CardDescription>Your current sign-in address and verification status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-all">{profile.email}</span>
          <Badge variant={profile.emailVerified ? "secondary" : "destructive"}>
            {profile.emailVerified ? "Verified" : "Verification required"}
          </Badge>
        </div>
        {state.emailChange && !callbackFailed ? (
          <FocusedStatus>
            <CheckCircle2 className="mr-2 inline size-4" aria-hidden="true" />
            Email change completed. Your account details are refreshing.
          </FocusedStatus>
        ) : callbackFailed ? (
          <FocusedStatus role="alert" className="border-destructive/25 bg-destructive/5">
            {expired
              ? "That email-change link expired."
              : "The email change could not be completed."}{" "}
            You can start again below.
          </FocusedStatus>
        ) : sent ? (
          <FocusedStatus>
            Verification sent. Confirm the request from your current inbox, then verify the new
            address when prompted.
          </FocusedStatus>
        ) : null}
        {!profile.emailVerified ? (
          <Alert>
            <AlertTitle>Verify your current email first</AlertTitle>
            <AlertDescription>
              Email changes require a verified account.{" "}
              <Link to="/verify-email" search={{ email: profile.email }}>
                Send a verification link
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : (
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="new-email">New email address</FieldLabel>
              <Input
                id="new-email"
                name="newEmail"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(error)}
              />
              <FieldDescription>
                We confirm this change by email; your current address remains active until
                completion.
              </FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button disabled={pending} type="submit" variant="outline">
              {pending ? "Sending…" : "Change email"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export function SavedCities() {
  const queryClient = useQueryClient()
  const cities = useInfiniteQuery(savedCitiesQueryOptions())
  const removal = useMutation({
    mutationFn: removeSavedCity,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.savedCities() }),
  })

  if (cities.isError)
    return (
      <ProblemState
        problem={problemFromError(cities.error)}
        onRetry={() => void cities.refetch()}
      />
    )
  const entries = cities.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Cities</CardTitle>
        <CardDescription>Shortlist destinations and jump back into discovery.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cities.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 motion-safe:animate-spin" />
            Loading saved cities…
          </p>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <p className="text-sm text-muted-foreground">You have no Saved Cities yet.</p>
            <Button asChild className="mt-3" variant="outline">
              <Link to="/cities">Discover cities</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {entries.map((city) =>
              city.id === null ? null : (
                <li
                  key={city.id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      className="block truncate font-medium hover:underline"
                      to="/cities/$cityId"
                      params={{ cityId: city.id }}
                    >
                      {city.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline size-3" aria-hidden="true" />
                      {city.region ? `${city.region}, ` : ""}
                      {city.country.name}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${city.name} from saved cities`}
                    disabled={removal.isPending}
                    onClick={() => removal.mutate(city.id!)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
        {removal.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {problemFromError(removal.error).detail}
          </p>
        ) : null}
        {cities.hasNextPage ? (
          <Button
            disabled={cities.isFetchingNextPage}
            onClick={() => void cities.fetchNextPage()}
            type="button"
            variant="outline"
          >
            {cities.isFetchingNextPage ? "Loading…" : "Load more Saved Cities"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function AccountDownloads() {
  const toast = useAppToast()
  const [pending, setPending] = useState<"calendar" | "export">()

  async function download(kind: "calendar" | "export") {
    setPending(kind)
    try {
      await downloadAccountData(kind)
      toast.show({ title: kind === "export" ? "Export downloaded" : "Calendar downloaded" })
    } catch (error) {
      toast.show({
        title: "Download failed",
        description: problemFromError(error).detail,
        variant: "destructive",
      })
    } finally {
      setPending(undefined)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Private downloads are requested with your signed-in session.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button
          disabled={Boolean(pending)}
          onClick={() => void download("export")}
          type="button"
          variant="outline"
        >
          <Download aria-hidden="true" />
          {pending === "export" ? "Preparing…" : "Download JSON export"}
        </Button>
        <Button
          disabled={Boolean(pending)}
          onClick={() => void download("calendar")}
          type="button"
          variant="outline"
        >
          <CalendarDays aria-hidden="true" />
          {pending === "calendar" ? "Preparing…" : "Download calendar (.ics)"}
        </Button>
      </CardContent>
    </Card>
  )
}

const impactLabels = {
  ownedTrips: "Owned Trips",
  tripStops: "Trip stops",
  itineraryItems: "Itinerary items",
  travelLegs: "Travel legs",
  collaboratorsLosingAccess: "Collaborators losing access",
  membershipsRemoved: "Memberships removed",
  shareLinksRevoked: "Share Links revoked",
  savedCitiesRemoved: "Saved Cities removed",
} as const

export function DeleteAccount({ email }: { email: string }) {
  const impact = useQuery(deletionImpactQueryOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [confirmation, setConfirmation] = useState("")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()
  const confirmed = confirmation.trim().toLowerCase() === email.toLowerCase()

  async function requestDeletion() {
    setPending(true)
    setError(undefined)
    const result = await authClient.deleteUser({
      callbackURL: absoluteApplicationUrl("/?accountDeleted=true"),
    })
    setPending(false)
    if (result.error) {
      setError(
        recoveryError(result.error, "We couldn’t send the deletion confirmation. Try again."),
      )
      return
    }
    if (result.data?.message === "User deleted") {
      expireSession(queryClient)
      await router.navigate({ to: "/", replace: true })
      return
    }
    setSent(true)
  }

  return (
    <Card className="ring-destructive/25">
      <CardHeader>
        <CardTitle>Permanent account deletion</CardTitle>
        <CardDescription>This is separate from signing out and cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {impact.isError ? (
          <ProblemState
            problem={problemFromError(impact.error)}
            onRetry={() => void impact.refetch()}
          />
        ) : impact.data ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(impactLabels).map(([key, label]) => (
              <div className="rounded-lg bg-muted/50 p-3" key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {impact.data[key as keyof typeof impactLabels]}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            Loading deletion impact…
          </p>
        )}
        <Alert variant="destructive">
          <AlertTitle>Deletion is irreversible</AlertTitle>
          <AlertDescription>
            Owned Trips and their planning records are deleted, collaborators lose access,
            memberships end, Share Links are revoked, and Saved Cities are removed.
          </AlertDescription>
        </Alert>
        {sent ? (
          <FocusedStatus>
            A permanent-deletion confirmation was sent to {email}. Your account remains active
            unless you use that email link before it expires.
          </FocusedStatus>
        ) : (
          <Field data-invalid={Boolean(confirmation && !confirmed)}>
            <FieldLabel htmlFor="delete-confirmation">
              Type your email address to continue
            </FieldLabel>
            <Input
              id="delete-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {confirmation && !confirmed ? (
              <FieldError>The address must exactly match {email}.</FieldError>
            ) : null}
          </Field>
        )}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {!sent ? (
          <DestructiveConfirmation
            confirmLabel={pending ? "Sending…" : "Send permanent-deletion email"}
            description="GlobeTrotter will email a time-limited confirmation link. Using it permanently deletes this account and the data summarized above."
            onConfirm={() => void requestDeletion()}
            title="Permanently delete your account?"
            trigger={
              <Button
                disabled={!confirmed || pending || !impact.data}
                type="button"
                variant="destructive"
              >
                Delete account permanently
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
