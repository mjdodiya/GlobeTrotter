import { z } from "zod"

const serverEnvironmentSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  DATABASE_URL: z.url().startsWith("postgresql://"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  WEB_ORIGIN: z.url(),
})

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>

export function loadServerEnvironment(environment: NodeJS.ProcessEnv): ServerEnvironment {
  return serverEnvironmentSchema.parse(environment)
}
