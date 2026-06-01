import { getRawDb } from "@/lib/db";
import { getBookById } from "@/lib/db/queries/books";
import { calculatePdfProgress, clampPdfPage, normalizeProgressPercentage, normalizeTotalPages } from "@/lib/reader/progress";
import { parseHighlightRects, serializeHighlightRects, validateHighlightRects } from "@/lib/reader/highlightRects";
import type { HighlightColor, ReaderHighlight, ReaderProgress } from "@/lib/types/reader";
import { HIGHLIGHT_COLORS } from "@/lib/types/reader";

export class ReaderQueryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type ProgressRow = {
  book_id: string;
  page: number | null;
  percent: number;
  updated_at: number;
};

type HighlightRow = {
  id: number;
  book_id: string;
  page: number | null;
  text: string;
  color: HighlightColor;
  rects: string | null;
  created_at: number;
  updated_at: number;
};

export type CreateHighlightInput = {
  bookId: string;
  page: number;
  text: string;
  color: HighlightColor;
  rects: unknown;
};

export type UpdatePdfProgressInput = {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage?: number;
};

export function getCurrentPdfProgress(bookId: string): ReaderProgress | null {
  const row = getRawDb()
    .prepare(
      `SELECT book_id, page, percent, updated_at
       FROM reading_progress
       WHERE book_id = ? AND locator_type = 'pdf-page'`,
    )
    .get(bookId) as ProgressRow | undefined;

  if (!row || !row.page) {
    return null;
  }

  return {
    bookId: row.book_id,
    currentPage: row.page,
    percentage: normalizeProgressPercentage(row.percent),
    updatedAt: row.updated_at,
  };
}

export function upsertPdfProgress(input: UpdatePdfProgressInput): ReaderProgress {
  const book = getBookById(input.bookId);
  if (!book) {
    throw new ReaderQueryError("Book not found", 404);
  }

  if (book.format !== "pdf") {
    throw new ReaderQueryError("Progress can only be saved for PDF books", 400);
  }

  const totalPages = normalizeTotalPages(input.totalPages);
  const currentPage = clampPdfPage(input.currentPage, totalPages);
  const percentage = normalizeProgressPercentage(input.percentage ?? calculatePdfProgress(currentPage, totalPages));
  const updatedAt = Date.now();

  getRawDb()
    .prepare(
      `INSERT INTO reading_progress (
        book_id, locator_type, page, percent, updated_at
      ) VALUES (?, 'pdf-page', ?, ?, ?)
      ON CONFLICT(book_id) DO UPDATE SET
        locator_type = excluded.locator_type,
        page = excluded.page,
        percent = excluded.percent,
        updated_at = excluded.updated_at`,
    )
    .run(book.id, currentPage, percentage, updatedAt);

  getRawDb()
    .prepare(
      `UPDATE books SET
        reading_percent = ?,
        total_pages = CASE
          WHEN total_pages IS NULL OR total_pages < ? THEN ?
          ELSE total_pages
        END,
        last_read_at = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(percentage, totalPages, totalPages, updatedAt, updatedAt, book.id);

  return {
    bookId: book.id,
    currentPage,
    percentage,
    updatedAt,
  };
}

export function listPageHighlights(bookId: string, page: number): ReaderHighlight[] {
  ensurePdfBook(bookId);
  const currentPage = assertPositivePage(page);
  const rows = getRawDb()
    .prepare(
      `SELECT id, book_id, page, text, color, rects, created_at, updated_at
       FROM highlights
       WHERE book_id = ? AND page = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(bookId, currentPage) as HighlightRow[];

  return rows.map(rowToHighlight).filter(Boolean) as ReaderHighlight[];
}

export function createPageHighlight(input: CreateHighlightInput): ReaderHighlight {
  ensurePdfBook(input.bookId);
  const page = assertPositivePage(input.page);
  const text = normalizeHighlightText(input.text);
  const color = normalizeHighlightColor(input.color);

  if (!validateHighlightRects(input.rects)) {
    throw new ReaderQueryError("Highlight rectangles are invalid", 400);
  }

  const now = Date.now();
  const result = getRawDb()
    .prepare(
      `INSERT INTO highlights (
        book_id, text, color, page, rects, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(input.bookId, text, color, page, serializeHighlightRects(input.rects), now, now);

  const row = getRawDb()
    .prepare(
      `SELECT id, book_id, page, text, color, rects, created_at, updated_at
       FROM highlights
       WHERE id = ?`,
    )
    .get(result.lastInsertRowid) as HighlightRow | undefined;

  if (!row) {
    throw new ReaderQueryError("Highlight insert failed", 500);
  }

  return rowToHighlight(row);
}

export function deletePageHighlight(highlightId: number): boolean {
  if (!Number.isInteger(highlightId) || highlightId < 1) {
    throw new ReaderQueryError("Highlight id is invalid", 400);
  }

  const result = getRawDb().prepare("DELETE FROM highlights WHERE id = ?").run(highlightId);
  return result.changes > 0;
}

function ensurePdfBook(bookId: string) {
  const book = getBookById(bookId);
  if (!book) {
    throw new ReaderQueryError("Book not found", 404);
  }

  if (book.format !== "pdf") {
    throw new ReaderQueryError("Highlights are only available for PDF books", 400);
  }

  return book;
}

function rowToHighlight(row: HighlightRow): ReaderHighlight {
  return {
    id: row.id,
    bookId: row.book_id,
    page: row.page ?? 1,
    text: row.text,
    color: normalizeHighlightColor(row.color),
    rects: parseHighlightRects(row.rects),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeHighlightColor(color: string): HighlightColor {
  if ((HIGHLIGHT_COLORS as readonly string[]).includes(color)) {
    return color as HighlightColor;
  }

  throw new ReaderQueryError("Highlight color is invalid", 400);
}

function normalizeHighlightText(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) {
    throw new ReaderQueryError("Highlight text is required", 400);
  }

  return text;
}

function assertPositivePage(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new ReaderQueryError("Page must be a positive integer", 400);
  }

  return value;
}
