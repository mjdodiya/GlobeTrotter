import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Search, X } from "lucide-react"
import { useState, type FormEvent } from "react"

import { CityCard } from "@/components/discovery/cards"
import { InitialResultsState, ResultsFooter, ResultsGrid } from "@/components/discovery/results"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { citiesQueryOptions, countriesQueryOptions } from "@/lib/discovery-api"
import { uniqueById, validateCitySearch, type CitySearch } from "@/lib/discovery-search"

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

type CityDraft = {
  countryCode: string
  q: string
  region: string
}

function draftFromSearch(search: CitySearch): CityDraft {
  return {
    countryCode: search.countryCode ?? "",
    q: search.q ?? "",
    region: search.region ?? "",
  }
}

export const Route = createFileRoute("/_public/cities")({
  validateSearch: validateCitySearch,
  component: CitySearchPage,
})

function CitySearchPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const searchKey = JSON.stringify(search)
  const [draftState, setDraftState] = useState<{ key: string; value: CityDraft }>(() => ({
    key: searchKey,
    value: draftFromSearch(search),
  }))
  const draft = draftState.key === searchKey ? draftState.value : draftFromSearch(search)
  const countriesQuery = useQuery(countriesQueryOptions())
  const citiesQuery = useInfiniteQuery(citiesQueryOptions(search))
  const cityResults = uniqueById(citiesQuery.data?.pages ?? [])

  function setDraft(value: CityDraft) {
    setDraftState({ key: searchKey, value })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void navigate({ search: validateCitySearch(draft) })
  }

  function clearFilters() {
    setDraft(draftFromSearch({}))
    void navigate({ search: {} })
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Catalog Cities
        </p>
        <h1 data-route-heading tabIndex={-1} className="text-3xl font-semibold tracking-tight">
          Find your next city
        </h1>
        <p className="text-pretty text-muted-foreground">
          Search by city name, country, or region. Filters stay in the URL so this view is easy to
          share and safe to revisit with the back button.
        </p>
      </header>

      <form
        aria-label="City filters"
        className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
        onSubmit={submit}
      >
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="city-query">
          City name
          <Input
            id="city-query"
            maxLength={100}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            placeholder="Try Kyoto"
            type="search"
            value={draft.q}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="city-country">
          Country
          <select
            className={selectClassName}
            disabled={countriesQuery.isPending}
            id="city-country"
            onChange={(event) => setDraft({ ...draft, countryCode: event.target.value })}
            value={draft.countryCode}
          >
            <option value="">All countries</option>
            {countriesQuery.data?.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="city-region">
          Region
          <Input
            id="city-region"
            maxLength={200}
            onChange={(event) => setDraft({ ...draft, region: event.target.value })}
            placeholder="Exact region"
            value={draft.region}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            <Search aria-hidden="true" /> Search
          </Button>
          <Button onClick={clearFilters} type="button" variant="ghost">
            <X aria-hidden="true" /> Clear
          </Button>
        </div>
      </form>

      <section aria-labelledby="city-results-heading" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="city-results-heading" className="text-xl font-semibold">
              City results
            </h2>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {citiesQuery.isPending
                ? "Searching…"
                : `${cityResults.length} ${cityResults.length === 1 ? "city" : "cities"} shown`}
            </p>
          </div>
          <p className="max-w-md text-xs text-muted-foreground">
            Cost index is a relative catalog comparison, not a currency or a quoted daily budget.
          </p>
        </div>
        <InitialResultsState
          emptyDescription="Try a broader name, country, or region."
          emptyTitle="No cities match these filters"
          error={citiesQuery.error}
          isPending={citiesQuery.isPending}
          itemCount={cityResults.length}
          onRetry={() => void citiesQuery.refetch()}
        />
        {cityResults.length ? (
          <ResultsGrid>
            {cityResults.map((city) => (
              <CityCard city={city} key={city.id} />
            ))}
          </ResultsGrid>
        ) : null}
        <ResultsFooter
          error={cityResults.length ? citiesQuery.error : null}
          hasNextPage={Boolean(citiesQuery.hasNextPage)}
          isFetchingNextPage={citiesQuery.isFetchingNextPage}
          onLoadMore={() => void citiesQuery.fetchNextPage()}
        />
      </section>
    </div>
  )
}
