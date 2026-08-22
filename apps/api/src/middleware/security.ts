import { DomainError } from "@globetrotter/domain"
import { createMiddleware } from "hono/factory"

import type { ApiEnvironment } from "../context.ts"

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"])

export function requireTrustedOrigin(trustedOrigins: ReadonlySet<string>) {
  return createMiddleware<ApiEnvironment>(async (context, next) => {
    if (safeMethods.has(context.req.method) || context.req.path.startsWith("/api/auth/")) {
      await next()
      return
    }

    const origin = context.req.header("Origin")
    if (!origin || !trustedOrigins.has(origin)) {
      throw new DomainError("FORBIDDEN", "Request origin is not trusted")
    }

    await next()
  })
}
