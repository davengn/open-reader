import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { POST as POST_PROGRESS } from "@/app/api/books/[id]/progress/route";
import { updateProgress } from "@/app/book/[id]/actions";
import { getRawDb } from "@/lib/db";
import { createBook, getBookById, markBookReady } from "@/lib/db/queries/books";
import { getCurrentPdfProgress } from "@/lib/db/queries/reader";
import { createTestEnv } from "../helpers/testEnv";

describe("PDF reader progress", () => {
  it("upserts one PDF progress row and mirrors the library summary", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();

    const first = await updateProgress({ bookId, currentPage: 2, totalPages: 8, percentage: 25 });
    const second = await updateProgress({ bookId, currentPage: 5, totalPages: 8, percentage: 62.5 });

    const progressRows = getRawDb()
      .prepare("SELECT COUNT(*) FROM reading_progress WHERE book_id = ?")
      .pluck()
      .get(bookId);

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: true, currentPage: 5, percentage: 62.5 });
    expect(progressRows).toBe(1);
    expect(getCurrentPdfProgress(bookId)).toMatchObject({ currentPage: 5, percentage: 62.5 });
    expect(getBookById(bookId)).toMatchObject({ readingPercent: 62.5, lastReadAt: expect.any(Number) });
  });

  it("clamps the saved page and percentage", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();

    const progress = await updateProgress({ bookId, currentPage: 99, totalPages: 10, percentage: 1000 });

    expect(progress).toMatchObject({ currentPage: 10, percentage: 100 });
  });

  it("saves progress through the keepalive route used when leaving the reader", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();

    const response = await POST_PROGRESS(
      new Request(`http://test.local/api/books/${bookId}/progress`, {
        method: "POST",
        body: JSON.stringify({ currentPage: 7, totalPages: 10, percentage: 70 }),
      }),
      { params: Promise.resolve({ id: bookId }) },
    );

    expect(response.status).toBe(200);
    expect(getCurrentPdfProgress(bookId)).toMatchObject({ currentPage: 7, percentage: 70 });
  });

  it("refreshes a stale stored page count from the loaded PDF total", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook(1);

    await updateProgress({ bookId, currentPage: 61, totalPages: 754, percentage: 8.1 });

    expect(getCurrentPdfProgress(bookId)).toMatchObject({ currentPage: 61, percentage: 8.1 });
    expect(getBookById(bookId)).toMatchObject({ totalPages: 754 });
  });
});

function createReadyPdfBook(totalPages = 10) {
  const id = randomUUID();
  createBook({
    id,
    title: "PDF",
    author: "Open Reader",
    format: "pdf",
    filePath: `books/${id}.pdf`,
    fileSizeBytes: 12,
    sha256: randomUUID(),
  });
  markBookReady(id, { title: "PDF", author: "Open Reader", totalPages, chunks: [] });
  return id;
}
