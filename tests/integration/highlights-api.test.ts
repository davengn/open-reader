import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/highlights/[id]/route";
import { GET, POST } from "@/app/api/highlights/route";
import { createBook, markBookReady } from "@/lib/db/queries/books";
import { createTestEnv } from "../helpers/testEnv";

describe("highlights API", () => {
  it("creates and lists highlights for a PDF page", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();

    const createResponse = await POST(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        body: JSON.stringify({
          bookId,
          page: 2,
          text: "Selected text",
          color: "yellow",
          rects: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.04 }],
        }),
      }),
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { highlight: { id: number } };

    const listResponse = await GET(new Request(`http://test.local/api/highlights?bookId=${bookId}&page=2`));
    const list = (await listResponse.json()) as { highlights: Array<{ id: number; text: string }> };

    expect(listResponse.status).toBe(200);
    expect(list.highlights).toEqual([expect.objectContaining({ id: created.highlight.id, text: "Selected text" })]);

    const wholeBookResponse = await GET(new Request(`http://test.local/api/highlights?bookId=${bookId}`));
    const wholeBookList = (await wholeBookResponse.json()) as { highlights: Array<{ id: number; text: string }> };

    expect(wholeBookResponse.status).toBe(200);
    expect(wholeBookList.highlights).toEqual([
      expect.objectContaining({ id: created.highlight.id, text: "Selected text" }),
    ]);
  });

  it("rejects invalid highlight rectangles", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();

    const response = await POST(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        body: JSON.stringify({
          bookId,
          page: 1,
          text: "Selected text",
          color: "green",
          rects: [{ x: 0, y: 0, width: 0, height: 0.1 }],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("deletes an existing highlight", async () => {
    await createTestEnv();
    const bookId = createReadyPdfBook();
    const createResponse = await POST(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        body: JSON.stringify({
          bookId,
          page: 1,
          text: "Delete me",
          color: "pink",
          rects: [{ x: 0.2, y: 0.3, width: 0.2, height: 0.03 }],
        }),
      }),
    );
    const created = (await createResponse.json()) as { highlight: { id: number } };

    const deleteResponse = await DELETE(new Request(`http://test.local/api/highlights/${created.highlight.id}`), {
      params: Promise.resolve({ id: String(created.highlight.id) }),
    });
    const listResponse = await GET(new Request(`http://test.local/api/highlights?bookId=${bookId}&page=1`));
    const list = (await listResponse.json()) as { highlights: unknown[] };

    expect(deleteResponse.status).toBe(204);
    expect(list.highlights).toEqual([]);
  });
});

function createReadyPdfBook() {
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
  markBookReady(id, { title: "PDF", author: "Open Reader", totalPages: 4, chunks: [] });
  return id;
}
