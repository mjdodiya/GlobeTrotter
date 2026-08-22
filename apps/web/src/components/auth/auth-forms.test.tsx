import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ForgotPasswordForm, ResetPasswordForm } from "./password-forms"
import { SignUpForm } from "./sign-up-form"
import { VerificationResendForm } from "./verification-resend-form"

describe("authentication forms", () => {
  it("focuses the first invalid sign-up field and does not submit", async () => {
    const signUp = vi.fn()
    render(<SignUpForm onSignUp={signUp} />)

    await userEvent.click(screen.getByRole("button", { name: "Create account" }))

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus()
    expect(screen.getByText("Enter your name.")).toHaveAttribute("role", "alert")
    expect(signUp).not.toHaveBeenCalled()
  })

  it("prevents duplicate sign-up requests while a submission is pending", async () => {
    let finish: ((value: { ok: true }) => void) | undefined
    const signUp = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          finish = resolve
        }),
    )
    render(<SignUpForm onSignUp={signUp} />)

    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "Asha Traveler")
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "asha@example.com")
    await userEvent.type(screen.getByLabelText("Password", { selector: "input" }), "long-enough")
    await userEvent.type(screen.getByLabelText("Confirm password"), "long-enough")
    const submit = screen.getByRole("button", { name: "Create account" })
    await userEvent.click(submit)

    expect(screen.getByRole("button", { name: "Creating account…" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Creating account…" }))
    expect(signUp).toHaveBeenCalledOnce()

    finish?.({ ok: true })
    expect(await screen.findByRole("button", { name: "Create account" })).toBeEnabled()
  })

  it("focuses generic recovery feedback after a reset request", async () => {
    render(<ForgotPasswordForm onRequestReset={vi.fn().mockResolvedValue({ ok: true })} />)

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "asha@example.com")
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }))

    const status = await screen.findByRole("status")
    expect(status).toHaveFocus()
    expect(status).toHaveTextContent("If an account exists")
  })

  it("validates reset confirmation before calling the server", async () => {
    const reset = vi.fn()
    render(<ResetPasswordForm onResetPassword={reset} />)

    await userEvent.type(screen.getByLabelText("New password"), "long-enough")
    await userEvent.type(screen.getByLabelText("Confirm new password"), "different-password")
    await userEvent.click(screen.getByRole("button", { name: "Reset password" }))

    expect(screen.getByLabelText("Confirm new password")).toHaveFocus()
    expect(screen.getByText("Passwords do not match.")).toHaveAttribute("role", "alert")
    expect(reset).not.toHaveBeenCalled()
  })

  it("announces a successfully resent verification link", async () => {
    const resend = vi.fn().mockResolvedValue({ ok: true })
    render(<VerificationResendForm initialEmail="asha@example.com" onResend={resend} />)

    await userEvent.click(screen.getByRole("button", { name: "Resend verification" }))

    expect(resend).toHaveBeenCalledWith("asha@example.com")
    expect(await screen.findByRole("status")).toHaveFocus()
  })
})
