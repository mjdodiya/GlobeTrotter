import { describe, expect, it } from "vitest"

import { tripAccessLabel, tripActions, tripStatusLabel, type TripAccess } from "./trip-presentation"

function access(level: TripAccess["level"]): TripAccess {
  const owner = level === "owner"
  return {
    level,
    canEdit: owner || level === "editor",
    canManageMembers: owner,
    canManageShareLinks: owner,
    canDelete: owner,
  }
}

describe("Trip presentation", () => {
  it("renders every Trip Status with domain language", () => {
    expect((["upcoming", "ongoing", "completed"] as const).map(tripStatusLabel)).toEqual([
      "Upcoming",
      "Ongoing",
      "Completed",
    ])
  })

  it("keeps owner, editor, and viewer actions distinct", () => {
    expect(tripAccessLabel(access("owner"))).toBe("Owned by you")
    expect(tripActions(access("owner"))).toEqual({
      canDelete: true,
      canEdit: true,
      canManageOwnerSettings: true,
    })
    expect(tripAccessLabel(access("editor"))).toBe("Member · Editor")
    expect(tripActions(access("editor"))).toEqual({
      canDelete: false,
      canEdit: true,
      canManageOwnerSettings: false,
    })
    expect(tripAccessLabel(access("viewer"))).toBe("Member · Viewer")
    expect(tripActions(access("viewer"))).toEqual({
      canDelete: false,
      canEdit: false,
      canManageOwnerSettings: false,
    })
  })
})
