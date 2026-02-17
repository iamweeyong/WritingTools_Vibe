import Database from '@tauri-apps/plugin-sql'

const DB_URL = 'sqlite:writingtools.db'

export async function getDb() {
  return Database.load(DB_URL)
}

export async function initDb() {
  const db = await getDb()
  await db.execute(
    'CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL)'
  )
  await db.execute(
    'CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, body TEXT)'
  )
  return db
}
