import type { Database } from "@globetrotter/db"
import { sql } from "drizzle-orm"
import { Hono } from "hono"

import type { ApiEnvironment } from "../context.ts"

export function createHealthRoutes(database: Database) {
  return new Hono<ApiEnvironment>()
    .get("/health", (context) => context.json({ status: "ok" as const }, 200))
    .get("/health/db", async (context) => {
      await database.execute(sql`select 1`)
      return context.json({ status: "ok" as const }, 200)
    })
}
