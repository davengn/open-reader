import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/books/[id]/route";
import { getRawDb } from "@/lib/db";
import { createBook, getBookById } from "@/lib/db/queries/books";
import {
  ensureBookStorage,
  relativeBookFilePath,
  removeStorageFile,
  sha256Buffer,
  writeBufferToStorage,
} from "@/lib/storage/bookFiles";
import { savePlaceholderCover } from "@/lib/storage/covers";
import { createTestEnv } from "../helpers/testEnv";

describe("book deletion cascade", () => {
  it("removes files and dependent rows after confirmation API call", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const id = randomUUID();
    const buffer = Buffer.from("delete me");
    const filePath = relativeBookFilePath(id, "pdf");
    await writeBufferToStorage(filePath, buffer);
    const cover = await savePlaceholderCover(id, "Delete Me", "Author", "pdf");

    createBook({
      id,
      title: "Delete Me",
      author: "Author",
      format: "pdf",
      filePath,
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });
    getRawDb().prepare("UPDATE books SET cover_path = ?, cover_hash = ? WHERE id = ?").run(cover.coverPath, cover.coverHash, id);
    seedDependentRows(id);

    const response = await DELETE(new Request(`http://test.local/api/books/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(204);
    expect(getBookById(id)).toBeNull();
    expect(countRows("reading_progress", id)).toBe(0);
    expect(countRows("highlights", id)).toBe(0);
    expect(countRows("notes", id)).toBe(0);
    expect(countRows("flashcards", id)).toBe(0);
    expect(countRows("book_chunks", id)).toBe(0);
    await expect(accessPath(filePath)).rejects.toThrow();
    await expect(accessPath(cover.coverPath)).rejects.toThrow();

    await removeStorageFile(filePath).catch(() => undefined);
  });
});

function seedDependentRows(bookId: string) {
  const now = Date.now();
  const rawDb = getRawDb();
  rawDb.prepare("INSERT INTO reading_progress (book_id, locator_type, page, percent, updated_at) VALUES (?, 'pdf-page', 1, 12, ?)").run(bookId, now);
  rawDb.prepare("INSERT INTO highlights (book_id, text, color, created_at) VALUES (?, 'quote', 'yellow', ?)").run(bookId, now);
  const highlightId = rawDb.prepare("SELECT id FROM highlights WHERE book_id = ?").pluck().get(bookId) as number;
  rawDb.prepare("INSERT INTO notes (book_id, highlight_id, content, updated_at) VALUES (?, ?, 'note', ?)").run(bookId, highlightId, now);
  rawDb.prepare("INSERT INTO flashcards (book_id, front, back, interval_days, ease_factor, created_at, updated_at) VALUES (?, 'front', 'back', 1, 2.5, ?, ?)").run(bookId, now, now);
  rawDb.prepare("INSERT INTO book_chunks (book_id, content, created_at) VALUES (?, 'chunk', ?)").run(bookId, now);
}

function countRows(table: string, bookId: string) {
  return getRawDb().prepare(`SELECT COUNT(*) FROM ${table} WHERE book_id = ?`).pluck().get(bookId) as number;
}

async function accessPath(relativePath: string) {
  const { resolveStoragePath } = await import("@/lib/storage/bookFiles");
  return access(resolveStoragePath(relativePath));
}
