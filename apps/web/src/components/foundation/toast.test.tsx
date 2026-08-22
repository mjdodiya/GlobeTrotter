import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it } from "vitest"

import { AppToastProvider, useAppToast } from "./toast"

function ToastTrigger() {
  const toast = useAppToast()
  return (
    <button onClick={() => toast.show({ title: "Trip saved", description: "All changes saved." })}>
      Save
    </button>
  )
}

it("announces toast feedback without moving focus", async () => {
  render(
    <AppToastProvider>
      <ToastTrigger />
    </AppToastProvider>,
  )

  const trigger = screen.getByRole("button", { name: "Save" })
  await userEvent.click(trigger)
  expect(await screen.findByText("Trip saved")).toBeVisible()
  expect(screen.getByText("All changes saved.").closest("li")).toHaveAttribute("role", "status")
  expect(trigger).toHaveFocus()
})
