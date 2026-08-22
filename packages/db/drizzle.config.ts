import { loadEnvFile } from "node:process"

import { defineConfig } from "drizzle-kit"

try {
  loadEnvFile("../../.env")
} catch {
  // Schema generation also works before a local environment file exists.
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://globetrotter:globetrotter@localhost:5432/globetrotter",
  },
  migrations: {
    prefix: "index",
    schema: "drizzle",
    table: "migrations",
  },
  strict: true,
  verbose: true,
})
