import { type Database, authSchema, db } from "@globetrotter/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export type AuthConfiguration = {
  baseURL: string
  email: EmailDelivery
  secret: string
  trustedOrigins: string[]
  database?: Database
}

export type EmailDelivery = {
  send(message: { subject: string; text: string; to: string }): Promise<void>
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
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        configuration.email.send({
          to: user.email,
          subject: "Reset your GlobeTrotter password",
          text: `Reset your GlobeTrotter password: ${url}`,
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        configuration.email.send({
          to: user.email,
          subject: "Verify your GlobeTrotter email",
          text: `Verify your GlobeTrotter email: ${url}`,
        }),
    },
    secret: configuration.secret,
    session: {
      cookieCache: {
        enabled: false,
      },
    },
    trustedOrigins: configuration.trustedOrigins,
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: ({ user, newEmail, url }) =>
          configuration.email.send({
            to: user.email,
            subject: "Confirm your GlobeTrotter email change",
            text: `Confirm changing your GlobeTrotter email to ${newEmail}: ${url}`,
          }),
      },
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: ({ user, url }) =>
          configuration.email.send({
            to: user.email,
            subject: "Confirm GlobeTrotter account deletion",
            text: `Permanently delete your GlobeTrotter account: ${url}`,
          }),
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
