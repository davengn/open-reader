import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/books/[id]/file/route";
import { createBook } from "@/lib/db/queries/books";
import { ensureBookStorage, sha256Buffer } from "@/lib/storage/bookFiles";
import { createTestEnv, createReadyBook } from "../helpers/testEnv";

describe("EPUB file route", () => {
  it("streams local EPUB bytes with the expected content type", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const { id, buffer } = await createReadyBook("epub");

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/epub+zip");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(buffer);
  });

  it("rejects non-ready EPUB books", async () => {
    await createTestEnv();
    const id = randomUUID();
    const buffer = Buffer.from("epub");
    
    createBook({
      id,
      title: "EPUB Ingesting",
      author: "Open Reader",
      format: "epub",
      filePath: "books/test.epub",
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Book is not ready to read yet");
  });

  it("returns not found for missing books", async () => {
    await createTestEnv();
    const id = randomUUID();

    const response = await GET(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(404);
  });
});
