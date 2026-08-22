import type { Database } from "@globetrotter/db"
import type { Logger } from "pino"

export type SessionData = {
  session: {
    id: string
  }
  user: {
    email: string
    emailVerified?: boolean
    id: string
    name: string
  }
}

export type AuthBoundary = {
  getSession(headers: Headers): Promise<SessionData | null>
  handler(request: Request): Promise<Response>
}

export type ExchangeRateProvider = {
  quote(input: { fromCurrency: string; toCurrency: string }): Promise<{
    effectiveAt: Date
    provider: string
    rate: string
  }>
}

export type ApiDependencies = {
  auth: AuthBoundary
  database: Database
  exchangeRates?: ExchangeRateProvider
  logger: Logger
  trustedOrigins: ReadonlySet<string>
  webOrigin: string
}

export type ApiEnvironment = {
  Variables: {
    requestId: string
    session: SessionData
  }
}
