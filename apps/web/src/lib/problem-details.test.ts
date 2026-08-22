import { describe, expect, it } from "vitest"

import { normalizeProblemDetails } from "./problem-details"

describe("normalizeProblemDetails", () => {
  it("preserves valid problem details and removes malformed field errors", () => {
    expect(
      normalizeProblemDetails(
        {
          type: "VALIDATION_ERROR",
          title: "Validation failed",
          status: 422,
          detail: "Please correct the highlighted fields.",
          errors: { name: ["Name is required."], ignored: "not-an-array" },
          requestId: "request-123",
        },
        422,
      ),
    ).toEqual({
      type: "VALIDATION_ERROR",
      title: "Validation failed",
      status: 422,
      detail: "Please correct the highlighted fields.",
      errors: { name: ["Name is required."] },
      requestId: "request-123",
      kind: "validation",
    })
  })

  it.each([
    [401, "UNAUTHENTICATED", "authentication"],
    [404, "TRIP_NOT_FOUND", "not-found"],
    [412, "STALE_TRIP_VERSION", "stale-trip"],
    [428, "PRECONDITION_REQUIRED", "precondition"],
    [500, "INTERNAL_ERROR", "unexpected"],
  ] as const)("classifies %s %s for deliberate UI handling", (status, type, kind) => {
    expect(normalizeProblemDetails({ status, type }, status).kind).toBe(kind)
  })
})
