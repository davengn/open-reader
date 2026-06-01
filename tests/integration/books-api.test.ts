import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/books/[id]/route";
import { createBook, getBookById } from "@/lib/db/queries/books";
import { ensureBookStorage, relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";
import { createTestEnv } from "../helpers/testEnv";

describe("book metadata API", () => {
  it("updates title and author metadata", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const id = randomUUID();
    const buffer = Buffer.from("metadata");
    const filePath = relativeBookFilePath(id, "pdf");
    await writeBufferToStorage(filePath, buffer);

    createBook({
      id,
      title: "Weak Metadata",
      author: "Unknown",
      format: "pdf",
      filePath,
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });

    const response = await PATCH(
      new Request(`http://test.local/api/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Java Concurrency in Practice", author: "Brian Goetz" }),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(getBookById(id)).toMatchObject({
      title: "Java Concurrency in Practice",
      author: "Brian Goetz",
    });
  });

  it("rejects blank metadata", async () => {
    await createTestEnv();
    const id = randomUUID();
    const response = await PATCH(
      new Request(`http://test.local/api/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: " " }),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(400);
  });
});
