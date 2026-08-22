import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { ProblemDetails } from "@/lib/problem-details"

import { ProblemState } from "./problem-state"

describe("ProblemState", () => {
  it("offers a retry and exposes the request ID for an unexpected route failure", async () => {
    const retry = vi.fn()
    const problem: ProblemDetails = {
      type: "INTERNAL_ERROR",
      title: "Unexpected server error",
      status: 500,
      detail: "An unexpected error occurred.",
      requestId: "request-500",
      kind: "unexpected",
    }

    render(<ProblemState problem={problem} onRetry={retry} />)

    expect(screen.getByRole("alert")).toHaveTextContent("Reference: request-500")
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it("directs an expired session back through sign-in", () => {
    render(
      <ProblemState
        problem={{
          type: "UNAUTHENTICATED",
          title: "Authentication required",
          status: 401,
          detail: "Sign in to continue.",
          kind: "authentication",
        }}
      />,
    )

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in?redirect=%2F",
    )
  })

  it("shows validation messages and makes missing Trip versions recoverable", () => {
    const { rerender } = render(
      <ProblemState
        problem={{
          type: "VALIDATION_ERROR",
          title: "Validation failed",
          status: 422,
          detail: "Correct the form.",
          errors: { name: ["Name is required."] },
          kind: "validation",
        }}
      />,
    )
    expect(screen.getByText("Name is required.")).toBeVisible()

    rerender(
      <ProblemState
        onRetry={() => undefined}
        problem={{
          type: "PRECONDITION_REQUIRED",
          title: "Trip version required",
          status: 428,
          detail: "Refresh before editing.",
          kind: "precondition",
        }}
      />,
    )
    expect(screen.getByRole("button", { name: "Refresh latest Trip" })).toBeVisible()
  })
})
