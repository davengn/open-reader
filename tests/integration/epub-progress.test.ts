import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/books/[id]/progress/route";
import { getBookById } from "@/lib/db/queries/books";
import { createTestEnv, createReadyBook } from "../helpers/testEnv";

describe("EPUB progress API", () => {
  it("saves and retrieves EPUB progress CFI payloads", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");

    // 1. Post progress
    const postResponse = await POST(
      new Request(`http://test.local/api/books/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cfi: "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
          percentage: 45.67,
          chapter: "Chapter 2",
        }),
      }),
      { params: Promise.resolve({ id }) }
    );

    expect(postResponse.status).toBe(200);
    const postBody = await postResponse.json();
    expect(postBody.progress.cfi).toBe("epubcfi(/6/4[chap-2]!/4/2/10/1:0)");
    expect(postBody.progress.percentage).toBe(45.7);
    expect(postBody.progress.chapter).toBe("Chapter 2");

    // 2. Get progress
    const getResponse = await GET(
      new Request(`http://test.local/api/books/${id}/progress`),
      { params: Promise.resolve({ id }) }
    );

    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();
    expect(getBody.progress.cfi).toBe("epubcfi(/6/4[chap-2]!/4/2/10/1:0)");
    expect(getBody.progress.percentage).toBe(45.7);
    expect(getBody.progress.chapter).toBe("Chapter 2");

    // 3. Verify books library summary mirroring
    const book = getBookById(id);
    expect(book?.readingPercent).toBe(45.7);
  });

  it("rejects invalid CFI payloads", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");

    const response = await POST(
      new Request(`http://test.local/api/books/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cfi: "invalid-cfi",
          percentage: 50,
        }),
      }),
      { params: Promise.resolve({ id }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("CFI is invalid");
  });

  it("returns null progress when none has been saved", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");

    const response = await GET(
      new Request(`http://test.local/api/books/${id}/progress`),
      { params: Promise.resolve({ id }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.progress).toBeNull();
  });
});
