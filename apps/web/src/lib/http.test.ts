import { describe, expect, it } from "vitest"

import { requireVersionedMutationResponse, requireVersionedResponseData } from "./http"

describe("versioned HTTP responses", () => {
  it("returns response data together with its Trip ETag", async () => {
    const response = new Response(JSON.stringify({ data: { id: "trip-1" } }), {
      headers: { "Content-Type": "application/json", ETag: '"3"' },
    })

    await expect(requireVersionedResponseData<{ id: string }>(response)).resolves.toEqual({
      data: { id: "trip-1" },
      etag: '"3"',
    })
  })

  it("throws a normalized problem for unsuccessful responses", async () => {
    const response = new Response(
      JSON.stringify({
        type: "STALE_TRIP_VERSION",
        title: "Trip version is stale",
        status: 412,
        detail: "Refresh the Trip before retrying.",
        requestId: "request-412",
      }),
      { status: 412, headers: { "Content-Type": "application/problem+json" } },
    )

    await expect(requireVersionedResponseData(response)).rejects.toMatchObject({
      problem: { kind: "stale-trip", requestId: "request-412" },
    })
  })

  it("preserves the new ETag from a successful mutation without a response body", async () => {
    const response = new Response(null, { status: 204, headers: { ETag: '"4"' } })

    await expect(requireVersionedMutationResponse(response)).resolves.toEqual({
      data: undefined,
      etag: '"4"',
    })
  })
})
