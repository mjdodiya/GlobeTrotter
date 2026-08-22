import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"

import { Button } from "@/components/ui/button"

import { DestructiveConfirmation } from "./destructive-confirmation"

it("requires confirmation and restores focus to the trigger after cancellation", async () => {
  const confirm = vi.fn()
  render(
    <DestructiveConfirmation
      title="Delete this Trip?"
      description="This cannot be undone."
      confirmLabel="Delete Trip"
      onConfirm={confirm}
      trigger={<Button>Open confirmation</Button>}
    />,
  )

  const trigger = screen.getByRole("button", { name: "Open confirmation" })
  await userEvent.click(trigger)
  expect(screen.getByRole("alertdialog")).toBeVisible()
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
  expect(confirm).not.toHaveBeenCalled()
  expect(trigger).toHaveFocus()
})
