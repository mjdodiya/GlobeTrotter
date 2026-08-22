import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, it, vi } from "vitest"

import { SignInForm } from "./sign-in-form"

it("submits labeled credentials and reports authentication errors accessibly", async () => {
  const signIn = vi
    .fn()
    .mockResolvedValue({ ok: false as const, message: "Email or password is incorrect." })
  render(<SignInForm onSignIn={signIn} />)

  await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "traveler@example.com")
  await userEvent.type(screen.getByLabelText("Password"), "wrong-password")
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

  expect(signIn).toHaveBeenCalledWith({
    email: "traveler@example.com",
    password: "wrong-password",
  })
  expect(screen.getByRole("alert")).toHaveTextContent("Email or password is incorrect.")
  expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
})
