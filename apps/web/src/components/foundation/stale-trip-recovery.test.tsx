import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"

import type { ProblemDetails } from "@/lib/problem-details"

import { StaleTripRecovery } from "./stale-trip-recovery"

it("requires the latest Trip to load before the user can retry a stale change", async () => {
  const refresh = vi.fn().mockResolvedValue(undefined)
  const retry = vi.fn()
  const problem: ProblemDetails = {
    type: "STALE_TRIP_VERSION",
    title: "Trip version is stale",
    status: 412,
    detail: "The Trip has changed.",
    kind: "stale-trip",
  }

  render(
    <>
      <button>Inspect latest Trip</button>
      <StaleTripRecovery
        open
        problem={problem}
        onCancel={() => undefined}
        onRefresh={refresh}
        onRetry={retry}
      />
    </>,
  )

  expect(screen.queryByRole("button", { name: "Retry my changes" })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole("button", { name: "Review latest Trip" }))
  expect(refresh).toHaveBeenCalledOnce()
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(screen.getByRole("region", { name: "Review the refreshed Trip" })).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: "Inspect latest Trip" }))
  expect(screen.getByRole("button", { name: "Inspect latest Trip" })).toHaveFocus()
  expect(screen.getByRole("button", { name: "Retry my changes" })).toBeEnabled()
  await userEvent.click(screen.getByRole("button", { name: "Retry my changes" }))
  expect(retry).toHaveBeenCalledOnce()
})
