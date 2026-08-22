const applicationOrigin = "https://globetrotter.local"

export function safeRedirectDestination(candidate: unknown, fallback = "/dashboard"): string {
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback
  }

  try {
    const destination = new URL(candidate, applicationOrigin)
    if (destination.origin !== applicationOrigin) return fallback
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return fallback
  }
}

export function signInHref(intendedDestination: unknown): string {
  const destination = safeRedirectDestination(intendedDestination)
  return `/sign-in?redirect=${encodeURIComponent(destination)}`
}
