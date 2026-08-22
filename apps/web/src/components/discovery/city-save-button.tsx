import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useLocation } from "@tanstack/react-router"
import { Bookmark, BookmarkCheck, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { savedCityIdsQueryOptions, setCitySaved } from "@/lib/discovery-api"
import { queryKeys } from "@/lib/query-keys"
import { sessionQueryOptions } from "@/lib/session"

export function CitySaveButton({ cityId, cityName }: { cityId: string; cityName: string }) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const sessionQuery = useQuery(sessionQueryOptions())
  const session = sessionQuery.data
  const savedCitiesQuery = useQuery({
    ...savedCityIdsQueryOptions(),
    enabled: Boolean(session),
  })
  const saved = savedCitiesQuery.data?.includes(cityId) ?? false
  const mutation = useMutation({
    mutationFn: () => setCitySaved(cityId, !saved),
    onSuccess: () => {
      queryClient.setQueryData<string[]>(queryKeys.savedCities(), (ids = []) =>
        saved ? ids.filter((id) => id !== cityId) : [...new Set([...ids, cityId])],
      )
    },
  })

  if (!session) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link
          aria-label={`Sign in to save ${cityName}`}
          to="/sign-in"
          search={{ redirect: location.href }}
        >
          <LogIn aria-hidden="true" /> Save city
        </Link>
      </Button>
    )
  }

  const label = saved ? `Remove ${cityName} from saved cities` : `Save ${cityName}`
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        aria-label={label}
        disabled={savedCitiesQuery.isPending || mutation.isPending}
        onClick={() => mutation.mutate()}
        size="sm"
        type="button"
        variant={saved ? "secondary" : "outline"}
      >
        {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
        {mutation.isPending ? "Saving…" : saved ? "Saved" : "Save city"}
      </Button>
      {mutation.isError ? (
        <span className="text-xs text-destructive" role="alert">
          Couldn’t update this Saved City. Try again.
        </span>
      ) : null}
    </div>
  )
}
