type ZonedDateTimeParts = {
  day: number
  hour: number
  minute: number
  month: number
  year: number
}

export const travelLegModes = ["flight", "train", "bus", "car", "ferry", "walk", "other"] as const
export type TravelLegMode = (typeof travelLegModes)[number]

export type TravelLegFormValues = {
  arrivalAt: string
  departureAt: string
  estimatedCost: string
  fromStopId: string
  mode: TravelLegMode
  notes: string
  provider: string
  reference: string
  title: string
  toStopId: string
}

export type TravelLegFormErrors = Partial<Record<keyof TravelLegFormValues, string>>

type EndpointTimezones = {
  arrivalTimezone?: string | undefined
  departureTimezone?: string | undefined
}

const moneyPattern = /^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/

export class ZonedDateTimeError extends Error {
  readonly kind: "ambiguous" | "invalid" | "nonexistent"

  constructor(kind: ZonedDateTimeError["kind"], message: string) {
    super(message)
    this.name = "ZonedDateTimeError"
    this.kind = kind
  }
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone)
  if (cached) return cached
  const created = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  })
  formatterCache.set(timeZone, created)
  return created
}

function partsAt(instant: number, timeZone: string): ZonedDateTimeParts {
  const parts = formatter(timeZone).formatToParts(new Date(instant))
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const value = (name: keyof ZonedDateTimeParts) => Number(values.get(name))
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  }
}

function parseInput(value: string): ZonedDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) {
    throw new ZonedDateTimeError("invalid", "Enter a complete local date and time.")
  }
  const [, year, month, day, hour, minute] = match
  const parsed = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  }
  const utc = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute),
  )
  if (
    utc.getUTCFullYear() !== parsed.year ||
    utc.getUTCMonth() !== parsed.month - 1 ||
    utc.getUTCDate() !== parsed.day ||
    utc.getUTCHours() !== parsed.hour ||
    utc.getUTCMinutes() !== parsed.minute
  ) {
    throw new ZonedDateTimeError("invalid", "Enter a valid local date and time.")
  }
  return parsed
}

function sameParts(first: ZonedDateTimeParts, second: ZonedDateTimeParts): boolean {
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day &&
    first.hour === second.hour &&
    first.minute === second.minute
  )
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

export function instantToZonedInput(value: string, timeZone: string): string {
  const instant = Date.parse(value)
  if (!Number.isFinite(instant)) {
    throw new ZonedDateTimeError("invalid", "The stored Travel Leg instant is invalid.")
  }
  const parts = partsAt(instant, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

export function zonedInputToInstant(value: string, timeZone: string): string {
  const desired = parseInput(value)
  const wallTimeAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  )
  const probes = [
    wallTimeAsUtc - 36 * 60 * 60 * 1_000,
    wallTimeAsUtc,
    wallTimeAsUtc + 36 * 60 * 60 * 1_000,
  ]
  const offsets = new Set(
    probes.map((probe) => {
      const local = partsAt(probe, timeZone)
      return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - probe
    }),
  )
  const candidates = [...offsets]
    .map((offset) => wallTimeAsUtc - offset)
    .filter((candidate) => sameParts(partsAt(candidate, timeZone), desired))
    .filter((candidate, index, all) => all.indexOf(candidate) === index)

  if (candidates.length === 0) {
    throw new ZonedDateTimeError(
      "nonexistent",
      `That local time does not exist in ${timeZone} because of a clock change. Choose another time.`,
    )
  }
  if (candidates.length > 1) {
    throw new ZonedDateTimeError(
      "ambiguous",
      `That local time occurs twice in ${timeZone} because of a clock change. Choose an unambiguous time.`,
    )
  }
  return new Date(candidates[0]!).toISOString()
}

export function validateTravelLegForm(
  values: TravelLegFormValues,
  timezones: EndpointTimezones,
): TravelLegFormErrors {
  const errors: TravelLegFormErrors = {}
  if (!values.title.trim()) errors.title = "Enter a Travel Leg title."
  if (!values.fromStopId) errors.fromStopId = "Choose a departure Stop."
  if (!values.toStopId) errors.toStopId = "Choose an arrival Stop."
  else if (values.fromStopId && values.toStopId === values.fromStopId) {
    errors.toStopId = "A Travel Leg must connect two different Stops."
  }
  if (!moneyPattern.test(values.estimatedCost)) {
    errors.estimatedCost = "Use a non-negative amount with up to four decimal places."
  }
  if (!values.departureAt) errors.departureAt = "Choose a departure date and time."
  if (!values.arrivalAt) errors.arrivalAt = "Choose an arrival date and time."

  let departureInstant: string | undefined
  let arrivalInstant: string | undefined
  if (values.departureAt && timezones.departureTimezone) {
    try {
      departureInstant = zonedInputToInstant(values.departureAt, timezones.departureTimezone)
    } catch (error) {
      errors.departureAt =
        error instanceof ZonedDateTimeError ? error.message : "Enter a valid departure time."
    }
  }
  if (values.arrivalAt && timezones.arrivalTimezone) {
    try {
      arrivalInstant = zonedInputToInstant(values.arrivalAt, timezones.arrivalTimezone)
    } catch (error) {
      errors.arrivalAt =
        error instanceof ZonedDateTimeError ? error.message : "Enter a valid arrival time."
    }
  }
  if (
    departureInstant &&
    arrivalInstant &&
    Date.parse(arrivalInstant) <= Date.parse(departureInstant)
  ) {
    errors.arrivalAt = "Arrival must be after departure as an absolute instant."
  }
  return errors
}
