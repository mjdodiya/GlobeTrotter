import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema/index.ts"

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
  })
  const database = drizzle({ client: pool, schema })

  return { database, pool }
}

export const { database: db, pool } = createDatabase()

export type Database = typeof db
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

export async function closeDatabase(): Promise<void> {
  await pool.end()
}
