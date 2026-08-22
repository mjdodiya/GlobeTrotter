import { type Database, authSchema, db } from "@globetrotter/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export type AuthConfiguration = {
  baseURL: string
  secret: string
  trustedOrigins: string[]
  database?: Database
}

export function createAuth(configuration: AuthConfiguration) {
  return betterAuth({
    appName: "GlobeTrotter",
    basePath: "/api/auth",
    baseURL: configuration.baseURL,
    database: drizzleAdapter(configuration.database ?? db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: configuration.secret,
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    trustedOrigins: configuration.trustedOrigins,
  })
}

export type Auth = ReturnType<typeof createAuth>
