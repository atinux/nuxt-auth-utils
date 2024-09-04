export default defineNitroPlugin(async () => {
  const db = useDatabase()
  await db.sql`
    CREATE TABLE IF NOT EXISTS users (
      user_name TEXT UNIQUE NOT NULL
    )`
  await db.sql`
    CREATE TABLE IF NOT EXISTS credentials (
      user_name TEXT NOT NULL,
      credential_id TEXT NOT NULL,
      credential_public_key TEXT NOT NULL,
      counter INTEGER NOT NULL,
      backed_up INTEGER NOT NULL,
      transports TEXT NOT NULL
    )`
})
