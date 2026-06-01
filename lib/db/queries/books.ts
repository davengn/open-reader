import { getRawDb } from "@/lib/db";
import type {
  BookFormat,
  BookRecord,
  BookStatusPayload,
  BookSummary,
  EditableBookMetadata,
} from "@/lib/types/books";
import { clampReadingPercent } from "@/lib/validation/books";

type BookRow = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  status: "indexing" | "ready" | "error";
  status_message: string | null;
  file_path: string;
  file_size_bytes: number;
  sha256: string;
  cover_path: string | null;
  cover_hash: string | null;
  total_pages: number | null;
  total_locations: number | null;
  reading_percent: number;
  last_read_at: number | null;
  created_at: number;
  updated_at: number;
};

export type CreateBookInput = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  filePath: string;
  fileSizeBytes: number;
  sha256: string;
};

export type ChunkInput = {
  content: string;
  chapter?: string | null;
  page?: number | null;
  cfi?: string | null;
  tokenStart?: number | null;
  tokenEnd?: number | null;
};

export type ProcessedBookUpdate = {
  title: string;
  author: string;
  coverPath?: string | null;
  coverHash?: string | null;
  totalPages?: number | null;
  totalLocations?: number | null;
  chunks: ChunkInput[];
};

function rowToBook(row: BookRow): BookRecord {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    format: row.format,
    status: row.status,
    statusMessage: row.status_message,
    filePath: row.file_path,
    fileSizeBytes: row.file_size_bytes,
    sha256: row.sha256,
    coverPath: row.cover_path,
    coverHash: row.cover_hash,
    coverUrl: row.cover_path ? `/api/covers/${encodeURIComponent(row.cover_path.split("/").pop() ?? "")}` : null,
    totalPages: row.total_pages,
    totalLocations: row.total_locations,
    readingPercent: row.reading_percent,
    lastReadAt: row.last_read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: BookRow): BookSummary {
  const book = rowToBook(row);
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    format: book.format,
    status: book.status,
    statusMessage: book.statusMessage,
    coverUrl: book.coverUrl,
    readingPercent: book.readingPercent,
    lastReadAt: book.lastReadAt,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

export function listBooks(): BookSummary[] {
  const rows = getRawDb()
    .prepare(
      `SELECT * FROM books
       ORDER BY created_at DESC, title COLLATE NOCASE ASC`,
    )
    .all() as BookRow[];

  return rows.map(rowToSummary);
}

export function getBookById(id: string): BookRecord | null {
  const row = getRawDb().prepare("SELECT * FROM books WHERE id = ?").get(id) as BookRow | undefined;
  return row ? rowToBook(row) : null;
}

export function getBookStatus(id: string): BookStatusPayload | null {
  const row = getRawDb()
    .prepare("SELECT id, status, status_message, reading_percent, updated_at FROM books WHERE id = ?")
    .get(id) as
    | {
        id: string;
        status: "indexing" | "ready" | "error";
        status_message: string | null;
        reading_percent: number;
        updated_at: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    status: row.status,
    statusMessage: row.status_message,
    readingPercent: row.reading_percent,
    updatedAt: row.updated_at,
  };
}

export function findBookBySha256(sha256: string): BookSummary | null {
  const row = getRawDb().prepare("SELECT * FROM books WHERE sha256 = ?").get(sha256) as BookRow | undefined;
  return row ? rowToSummary(row) : null;
}

export function createBook(input: CreateBookInput): BookSummary {
  const now = Date.now();

  getRawDb()
    .prepare(
      `INSERT INTO books (
        id, title, author, format, status, file_path, file_size_bytes,
        sha256, reading_percent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'indexing', ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      input.id,
      input.title,
      input.author,
      input.format,
      input.filePath,
      input.fileSizeBytes,
      input.sha256,
      now,
      now,
    );

  const book = getBookById(input.id);
  if (!book) {
    throw new Error("Book insert failed");
  }
  return book;
}

export function replaceBookChunks(bookId: string, chunks: ChunkInput[]) {
  const rawDb = getRawDb();
  const insert = rawDb.prepare(
    `INSERT INTO book_chunks (
      book_id, content, chapter, page, cfi, token_start, token_end, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const now = Date.now();

  rawDb.transaction(() => {
    rawDb.prepare("DELETE FROM book_chunks WHERE book_id = ?").run(bookId);
    for (const chunk of chunks) {
      insert.run(
        bookId,
        chunk.content,
        chunk.chapter ?? null,
        chunk.page ?? null,
        chunk.cfi ?? null,
        chunk.tokenStart ?? null,
        chunk.tokenEnd ?? null,
        now,
      );
    }
  })();
}

export function markBookReady(bookId: string, update: ProcessedBookUpdate): BookSummary {
  const rawDb = getRawDb();

  rawDb.transaction(() => {
    rawDb
      .prepare(
        `UPDATE books SET
          title = ?,
          author = ?,
          status = 'ready',
          status_message = NULL,
          cover_path = ?,
          cover_hash = ?,
          total_pages = ?,
          total_locations = ?,
          updated_at = ?
        WHERE id = ?`,
      )
      .run(
        update.title,
        update.author,
        update.coverPath ?? null,
        update.coverHash ?? null,
        update.totalPages ?? null,
        update.totalLocations ?? null,
        Date.now(),
        bookId,
      );

    rawDb.prepare("DELETE FROM book_chunks WHERE book_id = ?").run(bookId);
    const insert = rawDb.prepare(
      `INSERT INTO book_chunks (
        book_id, content, chapter, page, cfi, token_start, token_end, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    for (const chunk of update.chunks) {
      insert.run(
        bookId,
        chunk.content,
        chunk.chapter ?? null,
        chunk.page ?? null,
        chunk.cfi ?? null,
        chunk.tokenStart ?? null,
        chunk.tokenEnd ?? null,
        now,
      );
    }
  })();

  const book = getBookById(bookId);
  if (!book) {
    throw new Error("Processed book disappeared");
  }
  return book;
}

export function markBookError(bookId: string, statusMessage: string): BookSummary | null {
  getRawDb()
    .prepare(
      `UPDATE books
       SET status = 'error', status_message = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(statusMessage, Date.now(), bookId);

  const book = getBookById(bookId);
  return book ? book : null;
}

export function updateBookMetadata(id: string, patch: EditableBookMetadata): BookSummary | null {
  const current = getBookById(id);
  if (!current) {
    return null;
  }

  const nextTitle = patch.title ?? current.title;
  const nextAuthor = patch.author ?? current.author;

  getRawDb()
    .prepare("UPDATE books SET title = ?, author = ?, updated_at = ? WHERE id = ?")
    .run(nextTitle, nextAuthor, Date.now(), id);

  const updated = getBookById(id);
  return updated ? updated : null;
}

export function updateReadingProgress(bookId: string, percent: number) {
  const clamped = clampReadingPercent(percent);
  const now = Date.now();

  getRawDb()
    .prepare(
      `INSERT INTO reading_progress (book_id, locator_type, percent, updated_at)
       VALUES (?, 'pdf-page', ?, ?)
       ON CONFLICT(book_id) DO UPDATE SET
        percent = excluded.percent,
        updated_at = excluded.updated_at`,
    )
    .run(bookId, clamped, now);

  getRawDb()
    .prepare("UPDATE books SET reading_percent = ?, last_read_at = ?, updated_at = ? WHERE id = ?")
    .run(clamped, now, now, bookId);
}

export function deleteBookRow(id: string): boolean {
  const result = getRawDb().prepare("DELETE FROM books WHERE id = ?").run(id);
  return result.changes > 0;
}

export function countRowsForBook(tableName: string, bookId: string): number {
  const safeTables = new Set(["reading_progress", "highlights", "notes", "flashcards", "book_chunks"]);
  if (!safeTables.has(tableName)) {
    throw new Error(`Unsafe table count: ${tableName}`);
  }
  return getRawDb().prepare(`SELECT COUNT(*) FROM ${tableName} WHERE book_id = ?`).pluck().get(bookId) as number;
}
