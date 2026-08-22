import type { Trip, TripSummary } from "./trip-api"

export type TripAccess = Trip["access"] | TripSummary["access"]
export type TripStatus = Trip["status"] | TripSummary["status"]

export function tripStatusLabel(status: TripStatus): string {
  switch (status) {
    case "upcoming":
      return "Upcoming"
    case "ongoing":
      return "Ongoing"
    case "completed":
      return "Completed"
  }
}

export function tripAccessLabel(access: TripAccess): string {
  switch (access.level) {
    case "owner":
      return "Owned by you"
    case "editor":
      return "Member · Editor"
    case "viewer":
      return "Member · Viewer"
  }
}

export function tripActions(access: TripAccess) {
  return {
    canDelete: access.canDelete,
    canEdit: access.canEdit,
    canManageOwnerSettings: access.level === "owner",
  }
}
