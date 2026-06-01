import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DELETE } from "@/app/api/highlights/[id]/route";
import { GET, POST } from "@/app/api/highlights/route";
import { createTestEnv, createReadyBook } from "../helpers/testEnv";

describe("EPUB highlights API", () => {
  it("creates, lists, and deletes highlights for an EPUB book", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");

    // 1. Post a new highlight
    const createResponse = await POST(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: id,
          cfi: "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
          text: "EPUB highlighted passage",
          color: "green",
          chapter: "Chapter 2",
        }),
      }),
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { highlight: { id: number; cfi: string } };
    expect(created.highlight.cfi).toBe("epubcfi(/6/4[chap-2]!/4/2/10/1:0)");

    // 2. List highlights for the EPUB book
    const listResponse = await GET(
      new Request(`http://test.local/api/highlights?bookId=${id}&format=epub`)
    );
    expect(listResponse.status).toBe(200);
    const list = (await listResponse.json()) as { highlights: Array<{ id: number; text: string; cfi: string }> };
    expect(list.highlights).toHaveLength(1);
    expect(list.highlights[0].text).toBe("EPUB highlighted passage");
    expect(list.highlights[0].cfi).toBe("epubcfi(/6/4[chap-2]!/4/2/10/1:0)");

    const panelListResponse = await GET(
      new Request(`http://test.local/api/highlights?bookId=${id}&format=epub&includeNotes=true`)
    );
    const panelList = (await panelListResponse.json()) as { highlights: Array<{ id: number; note: null }> };
    expect(panelListResponse.status).toBe(200);
    expect(panelList.highlights).toEqual([expect.objectContaining({ id: created.highlight.id, note: null })]);

    // 3. Delete the highlight
    const deleteResponse = await DELETE(
      new Request(`http://test.local/api/highlights/${created.highlight.id}`),
      { params: Promise.resolve({ id: String(created.highlight.id) }) }
    );
    expect(deleteResponse.status).toBe(204);

    // 4. Verify list is empty
    const listResponseAfter = await GET(
      new Request(`http://test.local/api/highlights?bookId=${id}&format=epub`)
    );
    const listAfter = (await listResponseAfter.json()) as { highlights: unknown[] };
    expect(listAfter.highlights).toEqual([]);
  });

  it("rejects invalid CFI highlights", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");

    const response = await POST(
      new Request("http://test.local/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: id,
          cfi: "invalid-cfi",
          text: "Text",
          color: "blue",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
