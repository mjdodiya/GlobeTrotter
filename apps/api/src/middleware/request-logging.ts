import { createMiddleware } from "hono/factory"
import type { Logger } from "pino"

import type { ApiEnvironment } from "../context.ts"

function safeLogPath(path: string): string {
  return path.replace(/^(\/api\/v1\/link-shared-trips\/)[^/]+/, "$1[redacted]")
}

export function requestLogging(logger: Logger) {
  return createMiddleware<ApiEnvironment>(async (context, next) => {
    const startedAt = performance.now()
    await next()

    logger.info(
      {
        duration: Math.round((performance.now() - startedAt) * 100) / 100,
        method: context.req.method,
        path: safeLogPath(context.req.path),
        requestId: context.get("requestId"),
        status: context.res.status,
        userId: context.var.session?.user.id,
      },
      "request completed",
    )
  })
}
