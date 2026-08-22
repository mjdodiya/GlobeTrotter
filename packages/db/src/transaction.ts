import type { Database, DatabaseTransaction } from "./client.ts"

export function runInTransaction<T>(
  database: Database,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(operation)
}
