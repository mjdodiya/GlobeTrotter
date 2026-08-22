import type { Database } from "@globetrotter/db"
import type { Logger } from "pino"

export type SessionData = {
  session: {
    id: string
  }
  user: {
    email: string
    id: string
    name: string
  }
}

export type AuthBoundary = {
  getSession(headers: Headers): Promise<SessionData | null>
  handler(request: Request): Promise<Response>
}

export type ApiDependencies = {
  auth: AuthBoundary
  database: Database
  logger: Logger
  trustedOrigins: ReadonlySet<string>
}

export type ApiEnvironment = {
  Variables: {
    requestId: string
    session: SessionData
  }
}
