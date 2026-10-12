import { createDatabase } from 'db0'
import sqlite from 'db0/connectors/node-sqlite'

let database: ReturnType<typeof createDatabase> | undefined

// SQLite database of the playground, with `db0` directly so it runs on Nitro 2 and Nitro 3
export function useDatabase() {
  return database ||= createDatabase(sqlite({ name: 'db' }))
}
