import { z } from "zod"

const serverEnvironmentSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  DATABASE_URL: z.url().startsWith("postgresql://"),
  EXCHANGE_RATE_BASE_URL: z.url().default("https://api.frankfurter.dev/v2"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  SMTP_FROM: z.string().min(1).default("GlobeTrotter <noreply@globetrotter.local>"),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  WEB_ORIGIN: z.url(),
})

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>

export function loadServerEnvironment(environment: NodeJS.ProcessEnv): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment)
}
