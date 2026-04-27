import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "mylibrary.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function ensureBooksColumn(
  database: SQLiteDatabase,
  columnName: string,
  definition: string
) {
  const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(books)");
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await database.execAsync(`ALTER TABLE books ADD COLUMN ${columnName} ${definition};`);
}

async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Not Read',
      bookmark INTEGER,
      ai_summary TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_books_created_at ON books (created_at DESC);
  `);

  await ensureBooksColumn(database, "status", "TEXT NOT NULL DEFAULT 'Not Read'");
  await ensureBooksColumn(database, "bookmark", "INTEGER");
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
