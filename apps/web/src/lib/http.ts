import { normalizeProblemDetails, type ProblemDetails } from "./problem-details"
import { captureTripEtag, type TripEtag } from "./trip-etag"

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails

  constructor(problem: ProblemDetails) {
    super(problem.detail)
    this.name = "ApiProblemError"
    this.problem = problem
  }
}

async function responseBody(response: Response): Promise<unknown> {
  if (!response.headers.get("Content-Type")?.includes("json")) return undefined
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function requireResponseData<T>(response: Response): Promise<T> {
  const body = await responseBody(response)
  if (!response.ok) throw new ApiProblemError(normalizeProblemDetails(body, response.status))

  if (!body || typeof body !== "object" || !("data" in body)) {
    throw new ApiProblemError(
      normalizeProblemDetails(
        {
          type: "INVALID_RESPONSE",
          title: "Invalid server response",
          detail: "The server returned an incomplete response.",
        },
        response.status,
      ),
    )
  }
  return body.data as T
}

export async function requireVersionedResponseData<T>(
  response: Response,
): Promise<{ data: T; etag: TripEtag }> {
  const data = await requireResponseData<T>(response)
  return { data, etag: captureTripEtag(response.headers.get("ETag")) }
}

export async function requireVersionedMutationResponse<T = undefined>(
  response: Response,
): Promise<{ data: T; etag: TripEtag }> {
  if (response.status !== 204) return requireVersionedResponseData<T>(response)
  if (!response.ok) await requireResponseData<never>(response)

  return {
    data: undefined as T,
    etag: captureTripEtag(response.headers.get("ETag")),
  }
}
