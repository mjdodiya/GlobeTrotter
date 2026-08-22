import { describe, expect, it } from "vitest"

import { parseTripListSearch, tripListSearch } from "./trip-search"

describe("Trip list search", () => {
  it("keeps supported filters and drops invalid values", () => {
    expect(parseTripListSearch({ scope: "member", status: "ongoing" })).toEqual({
      scope: "member",
      status: "ongoing",
    })
    expect(parseTripListSearch({ scope: "someone-else", status: "draft" })).toEqual({})
  })

  it("uses compact URLs for the all filters", () => {
    expect(tripListSearch("all", "all")).toEqual({})
    expect(tripListSearch("owned", "completed")).toEqual({
      scope: "owned",
      status: "completed",
    })
  })
})
