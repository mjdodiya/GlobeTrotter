import { createAuthClient } from "better-auth/react"

const apiBaseUrl = import.meta.env.VITE_API_URL
if (!apiBaseUrl) throw new Error("VITE_API_URL is required")

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
})
