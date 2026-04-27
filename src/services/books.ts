import { getLibraryDb } from "../database/libraryDb";
import type { Book, BookDraft, BookStatus } from "../types/book";

type BookRow = {
  id: number;
  title: string;
  author: string;
  notes: string;
  status: string;
  bookmark: number | null;
  aiSummary: string | null;
  createdAt: number;
};

const validBookStatuses: BookStatus[] = ["In progress", "Read", "Not Read"];

function normalizeBookStatus(status: string): BookStatus {
  return validBookStatuses.includes(status as BookStatus) ? (status as BookStatus) : "Not Read";
}

function mapBookRow(row: BookRow): Book {
  return {
    id: String(row.id),
    title: row.title,
    author: row.author,
    notes: row.notes,
    status: normalizeBookStatus(row.status),
    bookmark: row.bookmark ?? undefined,
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
      status,
      bookmark,
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
  const normalizedStatus = normalizeBookStatus(book.status);
  const bookmark =
    normalizedStatus === "In progress" && typeof book.bookmark === "number" ? book.bookmark : null;

  await db.runAsync(
    `INSERT INTO books (title, author, notes, status, bookmark, ai_summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    book.title.trim(),
    book.author.trim(),
    book.notes.trim(),
    normalizedStatus,
    bookmark,
    book.aiSummary ?? null,
    Date.now()
  );
}

export async function updateBook(id: string, patch: Partial<BookDraft>): Promise<void> {
  const updates: string[] = [];
  const values: Array<string | number | null> = [];
  const nextStatus = patch.status !== undefined ? normalizeBookStatus(patch.status) : undefined;

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

  if (nextStatus !== undefined) {
    updates.push("status = ?");
    values.push(nextStatus);
  }

  if (patch.bookmark !== undefined) {
    updates.push("bookmark = ?");
    values.push(patch.bookmark ?? null);
  } else if (nextStatus !== undefined && nextStatus !== "In progress") {
    updates.push("bookmark = ?");
    values.push(null);
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
