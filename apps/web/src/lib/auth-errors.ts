type AuthError = {
  code?: string | undefined
  message?: string | undefined
}

export function signInError(error: AuthError): {
  field: "email" | "password"
  message: string
} {
  if (error.code === "EMAIL_NOT_VERIFIED") {
    return { field: "email", message: "Verify your email before signing in." }
  }
  return {
    field: "email",
    message: "We couldn’t sign you in. Check your email and password, then try again.",
  }
}

export function signUpError(error: AuthError): {
  field?: "email" | "password"
  message: string
} {
  if (error.code?.includes("PASSWORD")) {
    return { field: "password", message: error.message ?? "Choose a different password." }
  }
  if (error.code?.includes("USER_ALREADY_EXISTS")) {
    return { field: "email", message: "An account already exists for this email address." }
  }
  return { message: error.message ?? "We couldn’t create your account. Please try again." }
}

export function recoveryError(error: AuthError, fallback: string): string {
  return error.message ?? fallback
}
