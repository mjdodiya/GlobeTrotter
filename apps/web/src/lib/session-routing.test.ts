import { describe, expect, it } from "vitest"

import { safeRedirectDestination, signInHref } from "./session-routing"

describe("safeRedirectDestination", () => {
  it("preserves local destinations and rejects destinations that can leave the app", () => {
    expect(safeRedirectDestination("/trips/trip-1?tab=budget#summary")).toBe(
      "/trips/trip-1?tab=budget#summary",
    )
    expect(safeRedirectDestination("https://attacker.example/collect")).toBe("/dashboard")
    expect(safeRedirectDestination("//attacker.example/collect")).toBe("/dashboard")
    expect(safeRedirectDestination("/\\attacker.example/collect")).toBe("/dashboard")
  })

  it("encodes the intended destination into the sign-in URL", () => {
    expect(signInHref("/trips?scope=member#latest")).toBe(
      "/sign-in?redirect=%2Ftrips%3Fscope%3Dmember%23latest",
    )
  })
})
