import { getRawDb } from "@/lib/db";
import { getBookById } from "@/lib/db/queries/books";
import { parseHighlightRects } from "@/lib/reader/highlightRects";
import {
  canDetachDeletedHighlight,
  isWhitespaceOnlyNote,
  sanitizeNoteSearchQuery,
  validateNoteContent,
  validateStandaloneLocator,
} from "@/lib/reader/noteValidation";
import { HIGHLIGHT_COLORS, type HighlightColor, type ReaderNote, type ReaderPanelHighlight } from "@/lib/types/reader";
import type { BookRecord } from "@/lib/types/books";

export class ReaderNoteQueryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export type SaveReaderNoteInput = {
  bookId: string;
  noteId?: number | null;
  highlightId?: number | null;
  content: string;
  page?: number | null;
  cfi?: string | null;
};

export type SaveReaderNoteResult =
  | {
      note: ReaderNote;
      deleted: false;
      detached?: false;
    }
  | {
      note: ReaderNote;
      deleted: false;
      detached: true;
      message: string;
    }
  | {
      note: null;
      deleted: true;
    };

export type AnnotationExportData = {
  book: Pick<BookRecord, "id" | "title" | "author" | "format">;
  highlights: ReaderPanelHighlight[];
  standaloneNotes: ReaderNote[];
};

type NoteRow = {
  id: number;
  book_id: string;
  highlight_id: number | null;
  content: string;
  page: number | null;
  cfi: string | null;
  created_at: number | null;
  updated_at: number;
};

type HighlightRow = {
  id: number;
  book_id: string;
  text: string;
  color: string;
  page: number | null;
  cfi: string | null;
  chapter: string | null;
  rects: string | null;
  created_at: number;
  updated_at: number;
};

const DETACHED_MESSAGE =
  "The highlight this note was attached to has been deleted. The note has been saved as a standalone page note.";

export function listBookNotes(input: { bookId: string; standalone?: boolean; q?: string | null }): ReaderNote[] {
  ensureBook(input.bookId);
  const rawDb = getRawDb();

  if (input.q != null && input.q.trim()) {
    const query = sanitizeNoteSearchQuery(input.q);
    if (!query) {
      return [];
    }

    const standaloneSql =
      input.standalone === undefined ? "" : input.standalone ? "AND n.highlight_id IS NULL" : "AND n.highlight_id IS NOT NULL";
    const rows = rawDb
      .prepare(
        `SELECT n.id, n.book_id, n.highlight_id, n.content, n.page, n.cfi, n.created_at, n.updated_at
         FROM notes n
         JOIN notes_fts ON notes_fts.rowid = n.id
         WHERE notes_fts.bookId = ?
           AND notes_fts MATCH ?
           ${standaloneSql}
         ORDER BY bm25(notes_fts), n.updated_at DESC, n.id DESC`,
      )
      .all(input.bookId, query) as NoteRow[];
    return rows.map(rowToNote);
  }

  const standaloneSql =
    input.standalone === undefined ? "" : input.standalone ? "AND highlight_id IS NULL" : "AND highlight_id IS NOT NULL";
  const rows = rawDb
    .prepare(
      `SELECT id, book_id, highlight_id, content, page, cfi, created_at, updated_at
       FROM notes
       WHERE book_id = ?
         ${standaloneSql}
       ORDER BY COALESCE(page, 2147483647) ASC, COALESCE(cfi, '') COLLATE NOCASE ASC, updated_at DESC, id DESC`,
    )
    .all(input.bookId) as NoteRow[];

  return rows.map(rowToNote);
}

export function listAttachedNotesForHighlights(bookId: string, highlightIds: number[]) {
  if (highlightIds.length === 0) {
    return new Map<number, ReaderNote>();
  }

  ensureBook(bookId);
  const placeholders = highlightIds.map(() => "?").join(", ");
  const rows = getRawDb()
    .prepare(
      `SELECT id, book_id, highlight_id, content, page, cfi, created_at, updated_at
       FROM notes
       WHERE book_id = ?
         AND highlight_id IN (${placeholders})`,
    )
    .all(bookId, ...highlightIds) as NoteRow[];

  return new Map(rows.map((row) => [Number(row.highlight_id), rowToNote(row)]));
}

export function saveReaderNote(input: SaveReaderNoteInput): SaveReaderNoteResult {
  ensureBook(input.bookId);

  const contentValidation = validateNoteContent(input.content);
  if (!contentValidation.ok) {
    throw new ReaderNoteQueryError(contentValidation.error, 400);
  }

  const existingNote = input.noteId ? getNoteRow(input.bookId, input.noteId) ?? null : null;
  if (input.noteId && !existingNote) {
    throw new ReaderNoteQueryError("Note not found", 404);
  }

  if (isWhitespaceOnlyNote(input.content)) {
    if (existingNote) {
      deleteNoteById(input.bookId, existingNote.id);
    } else if (input.highlightId) {
      deleteAttachedNote(input.bookId, input.highlightId);
    }
    return { note: null, deleted: true };
  }

  const highlightId = input.highlightId === undefined ? existingNote?.highlight_id ?? null : input.highlightId;
  if (highlightId) {
    return saveAttachedNote(input, existingNote, highlightId);
  }

  return saveStandaloneNote(input, existingNote);
}

export function deleteReaderNote(bookId: string, noteId: number) {
  ensureBook(bookId);
  if (!deleteNoteById(bookId, noteId)) {
    throw new ReaderNoteQueryError("Note not found", 404);
  }
}

export function deleteReaderNoteById(noteId: number) {
  if (!Number.isInteger(noteId) || noteId < 1) {
    throw new ReaderNoteQueryError("Note id is invalid", 400);
  }

  const result = getRawDb().prepare("DELETE FROM notes WHERE id = ?").run(noteId);
  if (result.changes === 0) {
    throw new ReaderNoteQueryError("Note not found", 404);
  }
}

export function getAnnotationExportData(bookId: string): AnnotationExportData {
  const book = ensureBook(bookId);
  return {
    book: {
      id: book.id,
      title: book.title,
      author: book.author,
      format: book.format,
    },
    highlights: listPanelHighlightsForExport(bookId),
    standaloneNotes: listBookNotes({ bookId, standalone: true }),
  };
}

function saveAttachedNote(
  input: SaveReaderNoteInput,
  existingNote: NoteRow | null,
  highlightId: number,
): SaveReaderNoteResult {
  const highlight = getHighlightRow(input.bookId, highlightId);
  if (!highlight) {
    if (!canDetachDeletedHighlight({ page: input.page ?? existingNote?.page ?? null, cfi: input.cfi ?? existingNote?.cfi ?? null })) {
      throw new ReaderNoteQueryError("Highlight not found", 404);
    }

    const detached = saveStandaloneNote(
      {
        ...input,
        highlightId: null,
        page: input.page ?? existingNote?.page ?? null,
        cfi: input.cfi ?? existingNote?.cfi ?? null,
      },
      existingNote,
    );
    if (detached.deleted) {
      return detached;
    }

    return {
      ...detached,
      detached: true,
      message: DETACHED_MESSAGE,
    };
  }

  const page = input.page ?? highlight.page;
  const cfi = input.cfi ?? highlight.cfi;
  const now = Date.now();
  const existingAttached = existingNote ?? getAttachedNoteRow(input.bookId, highlightId);

  if (existingAttached) {
    getRawDb()
      .prepare(
        `UPDATE notes
         SET highlight_id = ?, content = ?, page = ?, cfi = ?, updated_at = ?
         WHERE id = ? AND book_id = ?`,
      )
      .run(highlightId, input.content, page, cfi, now, existingAttached.id, input.bookId);
    return { note: rowToNote(getRequiredNoteRow(input.bookId, existingAttached.id)), deleted: false };
  }

  const result = getRawDb()
    .prepare(
      `INSERT INTO notes (book_id, highlight_id, content, page, cfi, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(input.bookId, highlightId, input.content, page, cfi, now, now);

  return { note: rowToNote(getRequiredNoteRow(input.bookId, Number(result.lastInsertRowid))), deleted: false };
}

function saveStandaloneNote(input: SaveReaderNoteInput, existingNote: NoteRow | null): SaveReaderNoteResult {
  const locatorValidation = validateStandaloneLocator({ page: input.page ?? null, cfi: input.cfi ?? null });
  if (!locatorValidation.ok) {
    throw new ReaderNoteQueryError(locatorValidation.error, 400);
  }

  const now = Date.now();
  if (existingNote) {
    getRawDb()
      .prepare(
        `UPDATE notes
         SET highlight_id = NULL, content = ?, page = ?, cfi = ?, updated_at = ?
         WHERE id = ? AND book_id = ?`,
      )
      .run(input.content, input.page ?? null, input.cfi ?? null, now, existingNote.id, input.bookId);
    return { note: rowToNote(getRequiredNoteRow(input.bookId, existingNote.id)), deleted: false };
  }

  const result = getRawDb()
    .prepare(
      `INSERT INTO notes (book_id, highlight_id, content, page, cfi, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    )
    .run(input.bookId, input.content, input.page ?? null, input.cfi ?? null, now, now);

  return { note: rowToNote(getRequiredNoteRow(input.bookId, Number(result.lastInsertRowid))), deleted: false };
}

function listPanelHighlightsForExport(bookId: string): ReaderPanelHighlight[] {
  const rows = getRawDb()
    .prepare(
      `SELECT id, book_id, text, color, page, cfi, chapter, rects, created_at, updated_at
       FROM highlights
       WHERE book_id = ?
       ORDER BY COALESCE(page, 2147483647) ASC, COALESCE(chapter, '') COLLATE NOCASE ASC, created_at ASC, id ASC`,
    )
    .all(bookId) as HighlightRow[];

  const notes = listAttachedNotesForHighlights(
    bookId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => rowToPanelHighlight(row, notes.get(row.id) ?? null));
}

function ensureBook(bookId: string) {
  const book = getBookById(bookId);
  if (!book) {
    throw new ReaderNoteQueryError("Book not found", 404);
  }

  return book;
}

function getNoteRow(bookId: string, noteId: number) {
  if (!Number.isInteger(noteId) || noteId < 1) {
    throw new ReaderNoteQueryError("Note id is invalid", 400);
  }

  return getRawDb()
    .prepare(
      `SELECT id, book_id, highlight_id, content, page, cfi, created_at, updated_at
       FROM notes
       WHERE id = ? AND book_id = ?`,
    )
    .get(noteId, bookId) as NoteRow | undefined;
}

function getRequiredNoteRow(bookId: string, noteId: number) {
  const row = getNoteRow(bookId, noteId);
  if (!row) {
    throw new ReaderNoteQueryError("Note not found", 404);
  }

  return row;
}

function getAttachedNoteRow(bookId: string, highlightId: number) {
  return getRawDb()
    .prepare(
      `SELECT id, book_id, highlight_id, content, page, cfi, created_at, updated_at
       FROM notes
       WHERE book_id = ? AND highlight_id = ?`,
    )
    .get(bookId, highlightId) as NoteRow | undefined;
}

function getHighlightRow(bookId: string, highlightId: number) {
  if (!Number.isInteger(highlightId) || highlightId < 1) {
    throw new ReaderNoteQueryError("Highlight id is invalid", 400);
  }

  return getRawDb()
    .prepare(
      `SELECT id, book_id, text, color, page, cfi, chapter, rects, created_at, updated_at
       FROM highlights
       WHERE id = ? AND book_id = ?`,
    )
    .get(highlightId, bookId) as HighlightRow | undefined;
}

function deleteNoteById(bookId: string, noteId: number) {
  const result = getRawDb().prepare("DELETE FROM notes WHERE id = ? AND book_id = ?").run(noteId, bookId);
  return result.changes > 0;
}

function deleteAttachedNote(bookId: string, highlightId: number) {
  getRawDb().prepare("DELETE FROM notes WHERE book_id = ? AND highlight_id = ?").run(bookId, highlightId);
}

function rowToNote(row: NoteRow): ReaderNote {
  return {
    id: row.id,
    bookId: row.book_id,
    highlightId: row.highlight_id,
    content: row.content,
    page: row.page,
    cfi: row.cfi,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPanelHighlight(row: HighlightRow, note: ReaderNote | null): ReaderPanelHighlight {
  return {
    id: row.id,
    bookId: row.book_id,
    text: row.text,
    color: normalizeHighlightColor(row.color),
    page: row.page,
    cfi: row.cfi,
    chapter: row.chapter,
    rects: parseHighlightRects(row.rects),
    note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeHighlightColor(color: string): HighlightColor {
  if ((HIGHLIGHT_COLORS as readonly string[]).includes(color)) {
    return color as HighlightColor;
  }

  return "yellow";
}
