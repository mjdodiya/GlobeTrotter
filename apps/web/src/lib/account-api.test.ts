import { describe, expect, it } from "vitest"

import { filenameFromContentDisposition } from "./account-api"

describe("account downloads", () => {
  it("preserves ordinary and encoded server filenames", () => {
    expect(
      filenameFromContentDisposition('attachment; filename="travel-data.json"', "fallback"),
    ).toBe("travel-data.json")
    expect(
      filenameFromContentDisposition(
        "attachment; filename*=UTF-8''GlobeTrotter%20calendar.ics",
        "fallback",
      ),
    ).toBe("GlobeTrotter calendar.ics")
  })

  it("uses a safe fallback for invalid encoded filenames and strips path separators", () => {
    expect(filenameFromContentDisposition("attachment; filename*=UTF-8''%", "export.json")).toBe(
      "export.json",
    )
    expect(
      filenameFromContentDisposition('attachment; filename="../private.json"', "fallback"),
    ).toBe(".._private.json")
  })
})
