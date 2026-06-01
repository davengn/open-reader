import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getRawDb, resetDbConnectionForTests } from "@/lib/db";

import { randomUUID } from "node:crypto";
import { createBook, markBookReady } from "@/lib/db/queries/books";
import { relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";
import type { HighlightColor } from "@/lib/types/reader";

let currentRoot: string | null = null;

export async function createTestEnv() {
  await cleanupTestEnv();
  currentRoot = await mkdtemp(path.join(os.tmpdir(), "open-reader-"));
  process.env.OPEN_READER_DB_PATH = path.join(currentRoot, "reader.db");
  process.env.OPEN_READER_BOOK_ROOT = path.join(currentRoot, "books");
  resetDbConnectionForTests();
  return {
    root: currentRoot,
    dbPath: process.env.OPEN_READER_DB_PATH,
    bookRoot: process.env.OPEN_READER_BOOK_ROOT,
  };
}

export async function cleanupTestEnv() {
  resetDbConnectionForTests();
  const root = currentRoot;
  currentRoot = null;
  delete process.env.OPEN_READER_DB_PATH;
  delete process.env.OPEN_READER_BOOK_ROOT;

  if (root) {
    await rm(root, { recursive: true, force: true });
  }
}

export async function createReadyBook(format: "pdf" | "epub") {
  const id = randomUUID();
  const buffer = Buffer.from(format === "pdf" ? "%PDF-1.4\ntext" : "epub");
  const filePath = relativeBookFilePath(id, format);
  await writeBufferToStorage(filePath, buffer);

  createBook({
    id,
    title: "Reader Fixture",
    author: "Open Reader",
    format,
    filePath,
    fileSizeBytes: buffer.length,
    sha256: sha256Buffer(buffer),
  });
  markBookReady(id, { title: "Reader Fixture", author: "Open Reader", totalPages: 2, chunks: [] });

  return { id, buffer };
}

export async function createEmptyReadyBook(format: "pdf" | "epub", title = "Empty Fixture") {
  const id = randomUUID();
  const buffer = Buffer.from(format === "pdf" ? "%PDF-1.4\nempty" : "empty epub");
  const filePath = relativeBookFilePath(id, format);
  await writeBufferToStorage(filePath, buffer);

  createBook({
    id,
    title,
    author: "Open Reader",
    format,
    filePath,
    fileSizeBytes: buffer.length,
    sha256: sha256Buffer(buffer),
  });
  markBookReady(id, { title, author: "Open Reader", totalPages: 2, chunks: [] });

  return { id, buffer };
}

export function seedPdfHighlight(
  bookId: string,
  overrides: Partial<{
    text: string;
    color: HighlightColor;
    page: number;
    chapter: string | null;
    rects: string;
    createdAt: number;
  }> = {},
) {
  const now = overrides.createdAt ?? Date.now();
  const result = getRawDb()
    .prepare(
      `INSERT INTO highlights (book_id, text, color, page, chapter, rects, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      bookId,
      overrides.text ?? "Highlighted fixture passage",
      overrides.color ?? "yellow",
      overrides.page ?? 1,
      overrides.chapter ?? "Chapter 1",
      overrides.rects ?? JSON.stringify([{ x: 0.1, y: 0.2, width: 0.3, height: 0.04 }]),
      now,
      now,
    );

  return Number(result.lastInsertRowid);
}

export function seedEpubHighlight(
  bookId: string,
  overrides: Partial<{
    text: string;
    color: HighlightColor;
    cfi: string;
    chapter: string | null;
    createdAt: number;
  }> = {},
) {
  const now = overrides.createdAt ?? Date.now();
  const result = getRawDb()
    .prepare(
      `INSERT INTO highlights (book_id, text, color, cfi, chapter, rects, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '[]', ?, ?)`,
    )
    .run(
      bookId,
      overrides.text ?? "EPUB highlighted fixture passage",
      overrides.color ?? "green",
      overrides.cfi ?? "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
      overrides.chapter ?? "Chapter 2",
      now,
      now,
    );

  return Number(result.lastInsertRowid);
}

export function seedAttachedNote(
  bookId: string,
  highlightId: number,
  overrides: Partial<{ content: string; page: number | null; cfi: string | null; createdAt: number }> = {},
) {
  const now = overrides.createdAt ?? Date.now();
  const result = getRawDb()
    .prepare(
      `INSERT INTO notes (book_id, highlight_id, content, page, cfi, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      bookId,
      highlightId,
      overrides.content ?? "Attached note",
      overrides.page ?? null,
      overrides.cfi ?? null,
      now,
      now,
    );

  return Number(result.lastInsertRowid);
}

export function seedStandaloneNote(
  bookId: string,
  overrides: Partial<{ content: string; page: number | null; cfi: string | null; createdAt: number }> = {},
) {
  const now = overrides.createdAt ?? Date.now();
  const result = getRawDb()
    .prepare(
      `INSERT INTO notes (book_id, highlight_id, content, page, cfi, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    )
    .run(bookId, overrides.content ?? "Standalone note", overrides.page ?? 1, overrides.cfi ?? null, now, now);

  return Number(result.lastInsertRowid);
}

