import { getLibraryDb } from "../database/libraryDb";
import type { Book, BookDraft } from "../types/book";

type BookRow = {
  id: number;
  title: string;
  author: string;
  notes: string;
  aiSummary: string | null;
  createdAt: number;
};

function mapBookRow(row: BookRow): Book {
  return {
    id: String(row.id),
    title: row.title,
    author: row.author,
    notes: row.notes,
    aiSummary: row.aiSummary ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function fetchBooks(): Promise<Book[]> {
  const db = await getLibraryDb();
  const rows = await db.getAllAsync<BookRow>(
    `SELECT
      id,
      title,
      author,
      notes,
      ai_summary AS aiSummary,
      created_at AS createdAt
    FROM books
    ORDER BY created_at DESC, id DESC
    LIMIT 200`
  );

  return rows.map(mapBookRow);
}

export async function createBook(book: BookDraft): Promise<void> {
  const db = await getLibraryDb();

  await db.runAsync(
    `INSERT INTO books (title, author, notes, ai_summary, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    book.title.trim(),
    book.author.trim(),
    book.notes.trim(),
    book.aiSummary ?? null,
    Date.now()
  );
}

export async function updateBook(id: string, patch: Partial<BookDraft>): Promise<void> {
  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (patch.title !== undefined) {
    updates.push("title = ?");
    values.push(patch.title.trim());
  }

  if (patch.author !== undefined) {
    updates.push("author = ?");
    values.push(patch.author.trim());
  }

  if (patch.notes !== undefined) {
    updates.push("notes = ?");
    values.push(patch.notes.trim());
  }

  if (patch.aiSummary !== undefined) {
    updates.push("ai_summary = ?");
    values.push(patch.aiSummary ?? null);
  }

  if (updates.length === 0) {
    return;
  }

  const db = await getLibraryDb();
  await db.runAsync(`UPDATE books SET ${updates.join(", ")} WHERE id = ?`, ...values, Number(id));
}

export async function removeBook(id: string): Promise<void> {
  const db = await getLibraryDb();
  await db.runAsync("DELETE FROM books WHERE id = ?", Number(id));
}
