import { queryOptions } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"

import { apiClient } from "./api"
import type { PublicTrip } from "./discovery-api"
import { ApiProblemError, requireResponseData, requireVersionedResponseData } from "./http"
import { queryKeys } from "./query-keys"
import type { VersionedTripRequest } from "./trip-api"

type GetMembers = (typeof apiClient.api.v1.trips)[":tripId"]["members"]["$get"]
type GetShareLinks = (typeof apiClient.api.v1.trips)[":tripId"]["share-links"]["$get"]

export type TripMember = InferResponseType<GetMembers, 200>["data"][number]
export type ShareLink = InferResponseType<GetShareLinks, 200>["data"][number]
export type MemberRole = TripMember["role"]
export type CreatedShareLink = {
  expiresAt: string | null
  id: string
  url: string
  version: number
}
export type CopiedTrip = { id: string; version: number }

function tokenFingerprint(token: string): string {
  let hash = 2_166_136_261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(36)
}

export function tripMembersQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.tripMembers(tripId),
    queryFn: async () => {
      const response = await apiClient.api.v1.trips[":tripId"].members.$get({
        param: { tripId },
      })
      return requireVersionedResponseData<TripMember[]>(response)
    },
  })
}

export function tripShareLinksQueryOptions(tripId: string) {
  return queryOptions({
    queryKey: queryKeys.tripShareLinks(tripId),
    queryFn: async () => {
      const response = await apiClient.api.v1.trips[":tripId"]["share-links"].$get({
        param: { tripId },
      })
      return requireVersionedResponseData<ShareLink[]>(response)
    },
  })
}

export function addMemberRequest(
  tripId: string,
): VersionedTripRequest<{ email: string; role: MemberRole }> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"].members.$post({ json: input, param: { tripId } } as never, {
      headers,
    })
}

export function changeMemberRoleRequest(
  tripId: string,
): VersionedTripRequest<{ role: MemberRole; userId: string }> {
  return ({ role, userId }, headers) =>
    apiClient.api.v1.trips[":tripId"].members[":userId"].$patch(
      { json: { role }, param: { tripId, userId } } as never,
      { headers },
    )
}

export function removeMemberRequest(tripId: string): VersionedTripRequest<{ userId: string }> {
  return ({ userId }, headers) =>
    apiClient.api.v1.trips[":tripId"].members[":userId"].$delete(
      { param: { tripId, userId } },
      { headers },
    )
}

export async function leaveTrip(tripId: string): Promise<void> {
  const response = await apiClient.api.v1.trips[":tripId"].members.me.$delete({
    param: { tripId },
  })
  if (!response.ok) await requireResponseData<never>(response)
}

export function createShareLinkRequest(
  tripId: string,
): VersionedTripRequest<{ expiresAt: string | null }> {
  return (input, headers) =>
    apiClient.api.v1.trips[":tripId"]["share-links"].$post(
      { json: input, param: { tripId } } as never,
      { headers },
    )
}

export function revokeShareLinkRequest(
  tripId: string,
): VersionedTripRequest<{ shareLinkId: string }> {
  return ({ shareLinkId }, headers) =>
    apiClient.api.v1.trips[":tripId"]["share-links"][":shareLinkId"].$delete(
      { param: { shareLinkId, tripId } },
      { headers },
    )
}

export function linkSharedTripQueryOptions(token: string) {
  return queryOptions({
    // A token is a credential. Keep the raw value out of query keys, which may be inspected or
    // persisted, while retaining a derived discriminator for in-app route changes.
    queryKey: [...queryKeys.linkSharedTrip(), tokenFingerprint(token)],
    queryFn: async () => {
      const response = await apiClient.api.v1["link-shared-trips"][":token"].$get({
        param: { token },
      })
      return requireResponseData<PublicTrip>(response)
    },
    gcTime: 0,
    retry: (failureCount, error) =>
      error instanceof ApiProblemError && error.problem.status < 500 ? false : failureCount < 1,
  })
}

export async function copyTrip(tripId: string): Promise<CopiedTrip> {
  const response = await apiClient.api.v1.trips[":tripId"].copy.$post({
    json: {},
    param: { tripId },
  } as never)
  return requireResponseData<CopiedTrip>(response)
}

export async function copyLinkSharedTrip(token: string): Promise<CopiedTrip> {
  const response = await apiClient.api.v1["link-shared-trips"][":token"].copy.$post({
    json: {},
    param: { token },
  } as never)
  return requireResponseData<CopiedTrip>(response)
}
