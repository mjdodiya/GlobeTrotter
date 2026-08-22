import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TripForm, validateTripForm } from "./trip-form"

const initialValues = {
  name: "Kyoto spring",
  description: null,
  startDate: "2027-04-01",
  endDate: "2027-04-08",
  budgetLimit: "2000.0000",
  baseCurrency: "USD",
  visibility: "private" as const,
}

describe("Trip form", () => {
  it("explains the excluded departure date", () => {
    render(
      <TripForm
        allowPublic
        canManageOwnerSettings
        initialValues={initialValues}
        isPending={false}
        onSubmit={vi.fn()}
        submitLabel="Save Trip"
      />,
    )

    expect(screen.getByLabelText("Departure date")).toHaveAccessibleDescription(
      /excluded from the Travel Period.*day you depart/i,
    )
  })

  it("hides owner settings from an editor", () => {
    render(
      <TripForm
        allowPublic
        canManageOwnerSettings={false}
        initialValues={initialValues}
        isPending={false}
        onSubmit={vi.fn()}
        submitLabel="Save Trip"
      />,
    )

    expect(screen.queryByLabelText("Base Currency")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Visibility")).not.toBeInTheDocument()
  })

  it("lets an owner return a public Trip to private visibility", async () => {
    const onSubmit = vi.fn()
    render(
      <TripForm
        allowPublic
        canManageOwnerSettings
        initialValues={{ ...initialValues, visibility: "public" }}
        isPending={false}
        onSubmit={onSubmit}
        submitLabel="Save Trip"
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText("Visibility"), "private")
    await userEvent.click(screen.getByRole("button", { name: "Save Trip" }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ visibility: "private" }))
  })

  it("validates the half-open period and money before submitting", () => {
    expect(
      validateTripForm({
        ...initialValues,
        startDate: "2027-04-08",
        endDate: "2027-04-08",
        budgetLimit: "-1",
      }),
    ).toEqual({
      endDate: "The departure date must be after the first travel day.",
      budgetLimit: "Use a non-negative amount with up to four decimal places.",
    })
  })
})
