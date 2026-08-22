import type { ItemKind } from "./itinerary-api"

export type StopPeriod = { endDate: string; startDate: string }

export type StopFormValues = {
  cityId: string
  endDate: string
  notes: string
  startDate: string
}

export type ItemFormValues = {
  description: string
  durationMinutes: string
  endDate: string
  endTime: string
  estimatedCost: string
  kind: ItemKind
  notes: string
  scheduledDate: string
  sourceActivityId: string
  startTime: string
  title: string
}

export type StopFormErrors = Partial<Record<keyof StopFormValues, string>>
export type ItemFormErrors = Partial<Record<keyof ItemFormValues, string>>

const moneyPattern = /^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/

export function previousDate(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() - 1)
  return value.toISOString().slice(0, 10)
}

export function apiTime(value: string): string | null {
  return value ? `${value}:00` : null
}

export function inputTime(value: string | null): string {
  return value?.slice(0, 5) ?? ""
}

export function validateStopForm(values: StopFormValues, trip: StopPeriod): StopFormErrors {
  const errors: StopFormErrors = {}
  if (!values.cityId) errors.cityId = "Choose a Catalog City."
  if (!values.startDate) errors.startDate = "Choose the first day in this Stop."
  else if (values.startDate < trip.startDate || values.startDate >= trip.endDate) {
    errors.startDate = "The first Stop day must be inside the Trip period."
  }
  if (!values.endDate) errors.endDate = "Choose the Stop departure date."
  else if (values.startDate && values.endDate <= values.startDate) {
    errors.endDate = "The departure date must be after the first Stop day."
  } else if (values.endDate > trip.endDate) {
    errors.endDate = "The Stop cannot end after the Trip departure date."
  }
  return errors
}

export function validateItemForm(
  values: ItemFormValues,
  stop: StopPeriod,
  source: "catalog" | "custom",
): ItemFormErrors {
  const errors: ItemFormErrors = {}
  if (source === "catalog" && !values.sourceActivityId) {
    errors.sourceActivityId = "Choose a Catalog Activity."
  }
  if (source === "custom" && !values.title.trim()) errors.title = "Enter a title."
  if (!values.scheduledDate) errors.scheduledDate = "Choose a date."
  else if (values.scheduledDate < stop.startDate || values.scheduledDate >= stop.endDate) {
    errors.scheduledDate = "Choose a date from an included day in this Stop."
  }

  if (source === "custom" && !moneyPattern.test(values.estimatedCost)) {
    errors.estimatedCost = "Use a non-negative amount with up to four decimal places."
  } else if (
    source === "catalog" &&
    values.estimatedCost &&
    !moneyPattern.test(values.estimatedCost)
  ) {
    errors.estimatedCost = "Use a non-negative amount with up to four decimal places."
  }

  if (
    values.durationMinutes &&
    (!/^\d+$/.test(values.durationMinutes) || Number(values.durationMinutes) <= 0)
  ) {
    errors.durationMinutes = "Duration must be a positive number of minutes."
  }

  if (values.kind === "stay") {
    if (!values.endDate) {
      errors.endDate = "Choose a checkout date."
    } else if (values.scheduledDate && values.endDate < values.scheduledDate) {
      errors.endDate = "Checkout cannot be before check-in."
    } else if (values.endDate > stop.endDate) {
      errors.endDate = "Checkout cannot be after the Stop departure date."
    } else if (values.endDate === values.scheduledDate) {
      const checkIn = values.startTime || "00:00"
      const checkOut = values.endTime || "00:00"
      if (checkOut <= checkIn) {
        errors.endTime = "Same-day checkout must be later than check-in."
      }
    }
  }

  return errors
}
