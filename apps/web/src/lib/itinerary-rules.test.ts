import { describe, expect, it } from "vitest"

import { apiTime, validateItemForm, validateStopForm, type ItemFormValues } from "./itinerary-rules"

const stop = { startDate: "2027-04-02", endDate: "2027-04-05" }

function itemValues(overrides: Partial<ItemFormValues> = {}): ItemFormValues {
  return {
    sourceActivityId: "",
    kind: "activity",
    title: "Tea ceremony",
    description: "",
    scheduledDate: "2027-04-02",
    startTime: "10:00",
    endDate: "",
    endTime: "",
    durationMinutes: "90",
    estimatedCost: "40.0000",
    notes: "",
    ...overrides,
  }
}

describe("itinerary local date rules", () => {
  it("accepts a Stop whose excluded end matches the Trip end", () => {
    expect(
      validateStopForm(
        {
          cityId: "12",
          startDate: "2027-04-02",
          endDate: "2027-04-08",
          notes: "",
        },
        { startDate: "2027-04-01", endDate: "2027-04-08" },
      ),
    ).toEqual({})
  })

  it("rejects an ordinary item on the excluded Stop end date", () => {
    expect(
      validateItemForm(itemValues({ scheduledDate: stop.endDate }), stop, "custom"),
    ).toMatchObject({ scheduledDate: expect.stringMatching(/included day/i) })
  })

  it("allows Stay checkout on the excluded Stop end date", () => {
    expect(
      validateItemForm(
        itemValues({
          kind: "stay",
          scheduledDate: "2027-04-03",
          endDate: stop.endDate,
          endTime: "10:00",
        }),
        stop,
        "custom",
      ),
    ).toEqual({})
  })

  it("rejects checkout after the Stop and invalid same-day Stay times", () => {
    expect(
      validateItemForm(itemValues({ kind: "stay", endDate: "2027-04-06" }), stop, "custom"),
    ).toMatchObject({ endDate: expect.stringMatching(/after the Stop/i) })
    expect(
      validateItemForm(
        itemValues({
          kind: "stay",
          scheduledDate: "2027-04-03",
          endDate: "2027-04-03",
          startTime: "14:00",
          endTime: "11:00",
        }),
        stop,
        "custom",
      ),
    ).toMatchObject({ endTime: expect.stringMatching(/later than check-in/i) })
  })

  it("serializes browser time values without converting time zones", () => {
    expect(apiTime("09:30")).toBe("09:30:00")
    expect(apiTime("")).toBeNull()
  })
})
