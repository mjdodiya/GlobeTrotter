export type ProblemKind =
  | "authentication"
  | "not-found"
  | "precondition"
  | "stale-trip"
  | "unexpected"
  | "validation"

export type ProblemDetails = {
  detail: string
  kind: ProblemKind
  status: number
  title: string
  type: string
  errors?: Record<string, string[]>
  requestId?: string
}

function stringValue(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function fieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined

  const entries = Object.entries(value).flatMap(([field, messages]) => {
    if (!Array.isArray(messages)) return []
    const validMessages = messages.filter(
      (message): message is string => typeof message === "string" && message.length > 0,
    )
    return validMessages.length > 0 ? [[field, validMessages] as const] : []
  })

  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function classifyProblem(status: number, type: string, hasFieldErrors: boolean): ProblemKind {
  if (status === 401 || type === "UNAUTHENTICATED") return "authentication"
  if (status === 412 || type === "STALE_TRIP_VERSION") return "stale-trip"
  if (status === 428 || type === "PRECONDITION_REQUIRED") return "precondition"
  if (status === 404) return "not-found"
  if (status === 422 || type === "VALIDATION_ERROR" || hasFieldErrors) return "validation"
  return "unexpected"
}

export function normalizeProblemDetails(value: unknown, responseStatus: number): ProblemDetails {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  const status =
    typeof candidate.status === "number" && Number.isInteger(candidate.status)
      ? candidate.status
      : responseStatus
  const errors = fieldErrors(candidate.errors)
  const requestId = stringValue(candidate, "requestId")
  const type = stringValue(candidate, "type") ?? "UNEXPECTED_ERROR"

  return {
    type,
    title: stringValue(candidate, "title") ?? "Something went wrong",
    status,
    detail: stringValue(candidate, "detail") ?? "The request could not be completed.",
    ...(errors ? { errors } : {}),
    ...(requestId ? { requestId } : {}),
    kind: classifyProblem(status, type, errors !== undefined),
  }
}
