import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TripStatusBadge } from "./trip-summary-card"

describe("Trip Status", () => {
  it.each([
    ["upcoming", "Upcoming"],
    ["ongoing", "Ongoing"],
    ["completed", "Completed"],
  ] as const)("renders %s as %s", (status, label) => {
    render(<TripStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeVisible()
  })
})
