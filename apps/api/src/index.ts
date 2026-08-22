import { createAuth } from "@globetrotter/auth"
import { closeDatabase, db } from "@globetrotter/db"
import { serve } from "@hono/node-server"
import pino from "pino"

import { createApp } from "./app.ts"
import type { AuthBoundary } from "./context.ts"
import { loadServerEnvironment } from "./env.ts"

const environment = loadServerEnvironment(process.env)
const logger = pino({
  level: environment.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: [
      "password",
      "req.headers.cookie",
      "req.headers.authorization",
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
    ],
    remove: true,
  },
  ...(environment.NODE_ENV === "development"
    ? { transport: { options: { colorize: true, singleLine: true }, target: "pino-pretty" } }
    : {}),
})

const auth = createAuth({
  baseURL: environment.BETTER_AUTH_URL,
  database: db,
  secret: environment.BETTER_AUTH_SECRET,
  trustedOrigins: [environment.WEB_ORIGIN],
})

const authBoundary: AuthBoundary = {
  getSession: async (headers) => {
    const result = await auth.api.getSession({ headers })
    if (!result) return null
    return {
      session: { id: result.session.id },
      user: { email: result.user.email, id: result.user.id, name: result.user.name },
    }
  },
  handler: (request) => auth.handler(request),
}

const app = createApp({
  auth: authBoundary,
  database: db,
  logger,
  trustedOrigins: new Set([environment.WEB_ORIGIN]),
})

const server = serve({ fetch: app.fetch, port: environment.PORT }, (info) => {
  logger.info({ port: info.port }, "API listening")
})

let shuttingDown = false
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, "shutting down")

  server.close(async (error) => {
    try {
      await closeDatabase()
      if (error) {
        logger.error({ err: error }, "server shutdown failed")
        process.exitCode = 1
      }
    } finally {
      logger.flush()
    }
  })
}

process.once("SIGINT", () => void shutdown("SIGINT"))
process.once("SIGTERM", () => void shutdown("SIGTERM"))
