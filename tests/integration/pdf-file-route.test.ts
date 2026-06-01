import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/books/[id]/file/route";
import { createBook, markBookReady } from "@/lib/db/queries/books";
import { ensureBookStorage, relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";
import { createTestEnv } from "../helpers/testEnv";

describe("PDF file route", () => {
  it("streams local PDF bytes with the expected content type", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const { id, buffer } = await createReadyBook("pdf");

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(buffer);
  });


  it("returns not found for missing books", async () => {
    await createTestEnv();
    const id = randomUUID();

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects book paths that escape local storage", async () => {
    await createTestEnv();
    const id = randomUUID();
    const buffer = Buffer.from("%PDF-1.4\npath");

    createBook({
      id,
      title: "Unsafe",
      author: "Unknown",
      format: "pdf",
      filePath: "books/../outside.pdf",
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });
    markBookReady(id, { title: "Unsafe", author: "Unknown", totalPages: 1, chunks: [] });

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(500);
  });
});

async function createReadyBook(format: "pdf" | "epub") {
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
