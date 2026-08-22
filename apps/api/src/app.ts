import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { secureHeaders } from "hono/secure-headers"

import type { ApiDependencies, ApiEnvironment } from "./context.ts"
import { errorBody, handleApiError } from "./errors.ts"
import { requestLogging } from "./middleware/request-logging.ts"
import { requireTrustedOrigin } from "./middleware/security.ts"
import { createHealthRoutes } from "./routes/health.ts"

export function createApp(dependencies: ApiDependencies) {
  const app = new Hono<ApiEnvironment>()

  app.use("*", secureHeaders())
  app.use("/api/*", requestId())
  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Content-Type"],
      allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      origin: [...dependencies.trustedOrigins],
    }),
  )
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (context) =>
        context.json(errorBody("INVALID_INPUT", "Request body is too large"), 413),
    }),
  )
  app.use("/api/*", requestLogging(dependencies.logger))
  app.use("/api/*", requireTrustedOrigin(dependencies.trustedOrigins))

  app.all("/api/auth/*", (context) => dependencies.auth.handler(context.req.raw))

  const routes = app.route("/api", createHealthRoutes(dependencies.database))

  routes.notFound((context) => context.json(errorBody("NOT_FOUND", "Route not found"), 404))
  routes.onError((error, context) => {
    dependencies.logger.error({ err: error, requestId: context.var.requestId }, "request failed")
    return handleApiError(error, context)
  })

  return routes
}

export type AppType = ReturnType<typeof createApp>
