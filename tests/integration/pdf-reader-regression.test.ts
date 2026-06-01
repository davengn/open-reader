import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET as GET_FILE } from "@/app/api/books/[id]/file/route";
import { GET as GET_PROGRESS, POST as POST_PROGRESS } from "@/app/api/books/[id]/progress/route";
import { GET as GET_HIGHLIGHTS, POST as POST_HIGHLIGHTS } from "@/app/api/highlights/route";
import { DELETE as DELETE_HIGHLIGHT } from "@/app/api/highlights/[id]/route";
import { createBook, markBookReady } from "@/lib/db/queries/books";
import { ensureBookStorage, relativeBookFilePath, sha256Buffer, writeBufferToStorage } from "@/lib/storage/bookFiles";
import { createTestEnv } from "../helpers/testEnv";

describe("PDF reader shared API regression", () => {
  it("streams PDF files with application/pdf content type", async () => {
    await createTestEnv();
    await ensureBookStorage();
    const id = randomUUID();
    const buffer = Buffer.from("%PDF-1.4\ncontent");
    const filePath = relativeBookFilePath(id, "pdf");
    await writeBufferToStorage(filePath, buffer);

    createBook({
      id,
      title: "Regression PDF",
      author: "Open Reader",
      format: "pdf",
      filePath,
      fileSizeBytes: buffer.length,
      sha256: sha256Buffer(buffer),
    });
    markBookReady(id, { title: "Regression PDF", author: "Open Reader", totalPages: 5, chunks: [] });

    const response = await GET_FILE(new Request(`http://test.local/api/books/${id}/file`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(buffer);
  });

  it("handles PDF page-based progress GET and POST", async () => {
    await createTestEnv();
    const id = randomUUID();
    createBook({
      id,
      title: "Regression PDF",
      author: "Open Reader",
      format: "pdf",
      filePath: `books/${id}.pdf`,
      fileSizeBytes: 100,
      sha256: randomUUID(),
    });
    markBookReady(id, { title: "Regression PDF", author: "Open Reader", totalPages: 10, chunks: [] });

    // POST progress
    const postResponse = await POST_PROGRESS(
      new Request(`http://test.local/api/books/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPage: 3,
          totalPages: 10,
          percentage: 30.0,
        }),
      }),
      { params: Promise.resolve({ id }) }
    );

    expect(postResponse.status).toBe(200);

    // GET progress
    const getResponse = await GET_PROGRESS(
      new Request(`http://test.local/api/books/${id}/progress`),
      { params: Promise.resolve({ id }) }
    );

    expect(getResponse.status).toBe(200);
    const body = await getResponse.json();
    expect(body.progress).toMatchObject({
      currentPage: 3,
      percentage: 30.0,
    });
    expect(body.progress.cfi).toBeUndefined();
  });

  it("handles PDF page-based highlights GET, POST, and DELETE", async () => {
    await createTestEnv();
    const id = randomUUID();
    createBook({
      id,
      title: "Regression PDF",
      author: "Open Reader",
      format: "pdf",
      filePath: `books/${id}.pdf`,
      fileSizeBytes: 100,
      sha256: randomUUID(),
    });
    markBookReady(id, { title: "Regression PDF", author: "Open Reader", totalPages: 10, chunks: [] });

    // 1. Create a highlight
    const createResponse = await POST_HIGHLIGHTS(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: id,
          page: 2,
          text: "Regression test pdf highlight",
          color: "blue",
          rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.05 }],
        }),
      })
    );

    expect(createResponse.status).toBe(201);
    const createdBody = await createResponse.json();
    const highlightId = createdBody.highlight.id;

    // 2. Fetch highlights for this page
    const listResponse = await GET_HIGHLIGHTS(
      new Request(`http://test.local/api/highlights?bookId=${id}&page=2`)
    );
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.highlights.length).toBe(1);
    expect(listBody.highlights[0]).toMatchObject({
      id: highlightId,
      text: "Regression test pdf highlight",
      color: "blue",
      page: 2,
    });

    // 3. Delete the highlight
    const deleteResponse = await DELETE_HIGHLIGHT(
      new Request(`http://test.local/api/highlights/${highlightId}`),
      { params: Promise.resolve({ id: String(highlightId) }) }
    );
    expect(deleteResponse.status).toBe(204);

    // 4. Verify highlight is gone
    const listResponseEmpty = await GET_HIGHLIGHTS(
      new Request(`http://test.local/api/highlights?bookId=${id}&page=2`)
    );
    const listBodyEmpty = await listResponseEmpty.json();
    expect(listBodyEmpty.highlights.length).toBe(0);
  });
});
