import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Search, X } from "lucide-react"
import { useState, type FormEvent } from "react"

import { ActivityCard } from "@/components/discovery/cards"
import { InitialResultsState, ResultsFooter, ResultsGrid } from "@/components/discovery/results"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  activitiesQueryOptions,
  activityCategoriesQueryOptions,
  catalogCityOptionsQueryOptions,
} from "@/lib/discovery-api"
import { uniqueById, validateActivitySearch, type ActivitySearch } from "@/lib/discovery-search"

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const currencies = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "INR",
  "AUD",
  "BRL",
  "MXN",
  "ZAR",
  "MAD",
  "TRY",
  "AED",
  "THB",
  "SGD",
  "ISK",
] as const

type ActivityDraft = {
  categoryId: string
  cityId: string
  currency: string
  maxCost: string
  maxDurationMinutes: string
  q: string
}

export const Route = createFileRoute("/_public/activities")({
  validateSearch: validateActivitySearch,
  component: ActivitySearchPage,
})

function draftFromSearch(search: ActivitySearch): ActivityDraft {
  return {
    categoryId: search.categoryId ?? "",
    cityId: search.cityId ?? "",
    currency: search.currency ?? "USD",
    maxCost: search.maxCost ?? "",
    maxDurationMinutes: search.maxDurationMinutes ?? "",
    q: search.q ?? "",
  }
}

function ActivitySearchPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const searchKey = JSON.stringify(search)
  const [draftState, setDraftState] = useState<{ key: string; value: ActivityDraft }>(() => ({
    key: searchKey,
    value: draftFromSearch(search),
  }))
  const draft = draftState.key === searchKey ? draftState.value : draftFromSearch(search)
  const categoriesQuery = useQuery(activityCategoriesQueryOptions())
  const citiesQuery = useQuery(catalogCityOptionsQueryOptions())
  const activitiesQuery = useInfiniteQuery(activitiesQueryOptions(search))
  const activityResults = uniqueById(activitiesQuery.data?.pages ?? [])

  function setDraft(value: ActivityDraft) {
    setDraftState({ key: searchKey, value })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void navigate({ search: validateActivitySearch(draft) })
  }

  function clearFilters() {
    setDraft(draftFromSearch({}))
    void navigate({ search: {} })
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Catalog Activities
        </p>
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          Find something memorable to do
        </h1>
        <p className="text-pretty text-muted-foreground">
          Narrow curated ideas by city, category, duration, and planning cost. Search runs only when
          you submit, and the resulting filters remain in the URL.
        </p>
      </header>

      <form
        aria-label="Activity filters"
        className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-end"
        onSubmit={submit}
      >
        <label className="grid gap-1.5 text-sm font-medium xl:col-span-2" htmlFor="activity-query">
          Activity name
          <Input
            id="activity-query"
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            placeholder="Try museum"
            type="search"
            value={draft.q}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="activity-city">
          City
          <select
            className={selectClassName}
            disabled={citiesQuery.isPending}
            id="activity-city"
            onChange={(event) => setDraft({ ...draft, cityId: event.target.value })}
            value={draft.cityId}
          >
            <option value="">All cities</option>
            {citiesQuery.data?.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}, {city.country.code}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="activity-category">
          Category
          <select
            className={selectClassName}
            disabled={categoriesQuery.isPending}
            id="activity-category"
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            value={draft.categoryId}
          >
            <option value="">All categories</option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="activity-duration">
          Max minutes
          <Input
            id="activity-duration"
            min="1"
            onChange={(event) => setDraft({ ...draft, maxDurationMinutes: event.target.value })}
            placeholder="180"
            step="1"
            type="number"
            value={draft.maxDurationMinutes}
          />
        </label>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="activity-cost">
            Max cost
            <Input
              id="activity-cost"
              min="0"
              onChange={(event) => setDraft({ ...draft, maxCost: event.target.value })}
              placeholder="100"
              step="0.01"
              type="number"
              value={draft.maxCost}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="activity-currency">
            Currency
            <select
              className={selectClassName}
              id="activity-currency"
              onChange={(event) => setDraft({ ...draft, currency: event.target.value })}
              value={draft.currency}
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
          <Button type="submit">
            <Search aria-hidden="true" /> Search
          </Button>
          <Button onClick={clearFilters} type="button" variant="ghost">
            <X aria-hidden="true" /> Clear
          </Button>
        </div>
      </form>

      <section aria-labelledby="activity-results-heading" className="space-y-6">
        <div>
          <h2 id="activity-results-heading" className="text-xl font-semibold">
            Activity results
          </h2>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {activitiesQuery.isPending
              ? "Searching…"
              : `${activityResults.length} ${activityResults.length === 1 ? "activity" : "activities"} shown`}
          </p>
        </div>
        <InitialResultsState
          emptyDescription="Try removing one or more filters to broaden the search."
          emptyTitle="No activities match these filters"
          error={activitiesQuery.error}
          isPending={activitiesQuery.isPending}
          itemCount={activityResults.length}
          onRetry={() => void activitiesQuery.refetch()}
        />
        {activityResults.length ? (
          <ResultsGrid>
            {activityResults.map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}
          </ResultsGrid>
        ) : null}
        <ResultsFooter
          error={activityResults.length ? activitiesQuery.error : null}
          hasNextPage={Boolean(activitiesQuery.hasNextPage)}
          isFetchingNextPage={activitiesQuery.isFetchingNextPage}
          onLoadMore={() => void activitiesQuery.fetchNextPage()}
        />
      </section>
    </div>
  )
}
