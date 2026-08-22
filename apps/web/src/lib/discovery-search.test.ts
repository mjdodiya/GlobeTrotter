import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { citiesQueryOptions } from "./discovery-api"
import { uniqueById, validateActivitySearch, validateCitySearch } from "./discovery-search"

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(input instanceof Request ? input.url : String(input))
}

afterEach(() => vi.unstubAllGlobals())

describe("discovery filters", () => {
  it("normalizes City filters and removes unsupported URL values", () => {
    expect(
      validateCitySearch({
        countryCode: " jp ",
        q: "  Kyoto  ",
        region: "  Kansai ",
        unexpected: "ignored",
      }),
    ).toEqual({ countryCode: "JP", q: "Kyoto", region: "Kansai" })
    expect(validateCitySearch({ countryCode: "Japan", q: "   " })).toEqual({})
  })

  it("keeps a cost and currency pair atomic in Activity URLs", () => {
    expect(validateActivitySearch({ maxCost: "75.50" })).toEqual({})
    expect(
      validateActivitySearch({
        categoryId: "04",
        cityId: "12",
        currency: "eur",
        maxCost: "75.50",
        maxDurationMinutes: "180",
        q: " museum ",
      }),
    ).toEqual({
      categoryId: "4",
      cityId: "12",
      currency: "EUR",
      maxCost: "75.50",
      maxDurationMinutes: "180",
      q: "museum",
    })
  })

  it("deduplicates overlapping cursor pages by stable identifier", () => {
    expect(
      uniqueById([
        {
          data: [
            { id: "1", name: "Kyoto" },
            { id: "2", name: "Paris" },
          ],
        },
        {
          data: [
            { id: "2", name: "Paris updated" },
            { id: "3", name: "Rome" },
          ],
        },
      ]),
    ).toEqual([
      { id: "1", name: "Kyoto" },
      { id: "2", name: "Paris updated" },
      { id: "3", name: "Rome" },
    ])
  })

  it("preserves filters while advancing an opaque cursor", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "1" }], meta: { nextCursor: "opaque" } }), {
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "2" }], meta: { nextCursor: null } }), {
          headers: { "Content-Type": "application/json" },
        }),
      )
    vi.stubGlobal("fetch", fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await queryClient.fetchInfiniteQuery({
      ...citiesQueryOptions({ countryCode: "JP", q: "to" }),
      pages: 2,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstUrl = requestUrl(fetchMock.mock.calls[0]![0] as RequestInfo)
    const secondUrl = requestUrl(fetchMock.mock.calls[1]![0] as RequestInfo)
    expect(firstUrl.searchParams.get("q")).toBe("to")
    expect(firstUrl.searchParams.get("countryCode")).toBe("JP")
    expect(firstUrl.searchParams.has("cursor")).toBe(false)
    expect(secondUrl.searchParams.get("q")).toBe("to")
    expect(secondUrl.searchParams.get("countryCode")).toBe("JP")
    expect(secondUrl.searchParams.get("cursor")).toBe("opaque")
  })
})
