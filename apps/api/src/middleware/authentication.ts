import { DomainError } from "@globetrotter/domain"
import { createMiddleware } from "hono/factory"

import type { ApiDependencies, ApiEnvironment } from "../context.ts"

export function requireSession(dependencies: ApiDependencies) {
  return createMiddleware<ApiEnvironment>(async (context, next) => {
    const session = await dependencies.auth.getSession(context.req.raw.headers)
    if (!session) throw new DomainError("UNAUTHENTICATED", "Sign in to continue")

    context.set("session", session)
    await next()
  })
}
