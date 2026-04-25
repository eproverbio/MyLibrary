import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "mylibrary.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      ai_summary TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_books_created_at ON books (created_at DESC);
  `);
}

export async function getLibraryDb() {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await initializeDatabase(database);
      return database;
    });
  }

  return databasePromise;
}
