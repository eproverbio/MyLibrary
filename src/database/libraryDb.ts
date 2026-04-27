import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "mylibrary.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function getBooksColumns(database: SQLiteDatabase) {
  return database.getAllAsync<{ name: string }>("PRAGMA table_info(books)");
}

async function ensureBooksColumn(
  database: SQLiteDatabase,
  columnName: string,
  definition: string
) {
  const columns = await getBooksColumns(database);
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await database.execAsync(`ALTER TABLE books ADD COLUMN ${columnName} ${definition};`);
}

async function migrateLegacyGenreColumn(database: SQLiteDatabase) {
  const columns = await getBooksColumns(database);
  const hasLegacyColumn = columns.some((column) => column.name === "people");

  if (!hasLegacyColumn) {
    return;
  }

  const hasGenreColumn = columns.some((column) => column.name === "genre");
  if (!hasGenreColumn) {
    await database.execAsync("ALTER TABLE books ADD COLUMN genre TEXT NOT NULL DEFAULT '';");
  }

  await database.execAsync(`
    UPDATE books
    SET genre = CASE
      WHEN TRIM(COALESCE(genre, '')) = '' THEN COALESCE(people, '')
      ELSE genre
    END;
  `);

  await database.execAsync(`
    BEGIN TRANSACTION;
    CREATE TABLE books_next (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      edition TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Not Read',
      bookmark INTEGER,
      ai_summary TEXT,
      created_at INTEGER NOT NULL
    );
    INSERT INTO books_next (
      id,
      title,
      author,
      edition,
      genre,
      notes,
      status,
      bookmark,
      ai_summary,
      created_at
    )
    SELECT
      id,
      title,
      author,
      COALESCE(edition, ''),
      COALESCE(genre, ''),
      notes,
      status,
      bookmark,
      ai_summary,
      created_at
    FROM books;
    DROP TABLE books;
    ALTER TABLE books_next RENAME TO books;
    CREATE INDEX IF NOT EXISTS idx_books_created_at ON books (created_at DESC);
    COMMIT;
  `);
}

async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      edition TEXT NOT NULL DEFAULT '',
      genre TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Not Read',
      bookmark INTEGER,
      ai_summary TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_books_created_at ON books (created_at DESC);
  `);

  await migrateLegacyGenreColumn(database);
  await ensureBooksColumn(database, "edition", "TEXT NOT NULL DEFAULT ''");
  await ensureBooksColumn(database, "genre", "TEXT NOT NULL DEFAULT ''");
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
