import type { AppType } from "@globetrotter/api"
import { hc } from "hono/client"

const apiBaseUrl = import.meta.env.VITE_API_URL
if (!apiBaseUrl) throw new Error("VITE_API_URL is required")

export const apiClient = hc<AppType>(apiBaseUrl, {
  init: {
    credentials: "include",
  },
})
