import { describe, expect, it } from "vitest"

import { captureTripEtag, ifMatchHeaders, MissingTripEtagError } from "./trip-etag"

describe("Trip ETag handling", () => {
  it("captures an exact quoted version and reuses it for If-Match", () => {
    const etag = captureTripEtag('"17"')

    expect(etag).toBe('"17"')
    expect(ifMatchHeaders(etag)).toEqual({ "If-Match": '"17"' })
  })

  it("blocks editing when a Trip read does not supply a usable version", () => {
    expect(() => captureTripEtag(null)).toThrow(MissingTripEtagError)
    expect(() => captureTripEtag("17")).toThrow(MissingTripEtagError)
    expect(() => captureTripEtag('W/"17"')).toThrow(MissingTripEtagError)
  })
})
