import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/highlights/route";
import { createTestEnv, createReadyBook, seedAttachedNote, seedEpubHighlight, seedPdfHighlight } from "../helpers/testEnv";

describe("highlights panel API", () => {
  it("lists all PDF highlights for a book with attached notes", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    const highlightId = seedPdfHighlight(id, { text: "Panel passage", page: 2 });
    seedAttachedNote(id, highlightId, { content: "Panel note", page: 2 });

    const response = await GET(new Request(`http://test.local/api/highlights?bookId=${id}&includeNotes=true`));
    const payload = (await response.json()) as {
      highlights: Array<{ id: number; text: string; note: { content: string } | null; page: number }>;
    };

    expect(response.status).toBe(200);
    expect(payload.highlights).toEqual([
      expect.objectContaining({
        id: highlightId,
        text: "Panel passage",
        page: 2,
        note: expect.objectContaining({ content: "Panel note" }),
      }),
    ]);
  });

  it("preserves page-scoped PDF highlight listing", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    seedPdfHighlight(id, { text: "Page 1", page: 1 });
    seedPdfHighlight(id, { text: "Page 2", page: 2 });

    const response = await GET(new Request(`http://test.local/api/highlights?bookId=${id}&page=2`));
    const payload = (await response.json()) as { highlights: Array<{ text: string }> };

    expect(response.status).toBe(200);
    expect(payload.highlights.map((highlight) => highlight.text)).toEqual(["Page 2"]);
  });

  it("lists EPUB panel highlights with notes when includeNotes is requested", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("epub");
    const highlightId = seedEpubHighlight(id, { text: "EPUB panel passage" });
    seedAttachedNote(id, highlightId, {
      content: "EPUB panel note",
      cfi: "epubcfi(/6/4[chap-2]!/4/2/10/1:0)",
    });

    const response = await GET(new Request(`http://test.local/api/highlights?bookId=${id}&format=epub&includeNotes=true`));
    const payload = (await response.json()) as {
      highlights: Array<{ id: number; text: string; cfi: string; note: { content: string } | null }>;
    };

    expect(response.status).toBe(200);
    expect(payload.highlights).toEqual([
      expect.objectContaining({
        id: highlightId,
        text: "EPUB panel passage",
        note: expect.objectContaining({ content: "EPUB panel note" }),
      }),
    ]);
  });
});
