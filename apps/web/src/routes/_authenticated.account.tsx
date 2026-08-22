import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import {
  AccountDownloads,
  DeleteAccount,
  EmailSettings,
  ProfilePreferences,
  SavedCities,
} from "@/components/account/account-settings"
import { accountProfileQueryOptions } from "@/lib/account-api"

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(search.emailChange === "complete" ? { emailChange: "complete" as const } : {}),
    ...(typeof search.error === "string" ? { error: search.error } : {}),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountProfileQueryOptions()),
  component: AccountSettingsPage,
})

function AccountSettingsPage() {
  const profile = useSuspenseQuery(accountProfileQueryOptions()).data
  const search = Route.useSearch()

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-6">
      <header className="space-y-2">
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          Account settings
        </h1>
        <p className="text-muted-foreground">
          Manage your identity, planning defaults, Saved Cities, and private account data.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfilePreferences profile={profile} />
        <EmailSettings profile={profile} state={search} />
      </div>
      <SavedCities />
      <AccountDownloads />
      <DeleteAccount email={profile.email} />
    </div>
  )
}
