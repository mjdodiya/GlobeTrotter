import { describe, expect, it } from "vitest"

import {
  instantToZonedInput,
  validateTravelLegForm,
  zonedInputToInstant,
  type TravelLegFormValues,
} from "./travel-leg-rules"

function formValues(overrides: Partial<TravelLegFormValues> = {}): TravelLegFormValues {
  return {
    arrivalAt: "2027-04-02T08:00",
    departureAt: "2027-04-02T10:00",
    estimatedCost: "300.0000",
    fromStopId: "tokyo",
    mode: "flight",
    notes: "",
    provider: "Globe Air",
    reference: "GT9",
    title: "Tokyo to Los Angeles",
    toStopId: "los-angeles",
    ...overrides,
  }
}

describe("Travel Leg time-zone rules", () => {
  it("round-trips a stored instant through its endpoint time zone", () => {
    const instant = "2027-04-02T01:30:00.000Z"

    const localInput = instantToZonedInput(instant, "Asia/Tokyo")

    expect(localInput).toBe("2027-04-02T10:30")
    expect(zonedInputToInstant(localInput, "Asia/Tokyo")).toBe(instant)
  })

  it("validates chronology using each endpoint time zone", () => {
    expect(
      validateTravelLegForm(formValues(), {
        departureTimezone: "Asia/Tokyo",
        arrivalTimezone: "America/Los_Angeles",
      }),
    ).toEqual({})

    expect(
      validateTravelLegForm(
        formValues({
          departureAt: "2027-04-02T10:00",
          arrivalAt: "2027-04-03T01:00",
          fromStopId: "los-angeles",
          toStopId: "tokyo",
        }),
        {
          departureTimezone: "America/Los_Angeles",
          arrivalTimezone: "Asia/Tokyo",
        },
      ),
    ).toMatchObject({ arrivalAt: expect.stringMatching(/after departure/i) })
  })
})
