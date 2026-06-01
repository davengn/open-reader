import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/books/[id]/export/route";
import {
  createEmptyReadyBook,
  createReadyBook,
  createTestEnv,
  seedAttachedNote,
  seedPdfHighlight,
  seedStandaloneNote,
} from "../helpers/testEnv";

describe("notes export API", () => {
  it("exports highlights and notes as Markdown attachment", async () => {
    await createTestEnv();
    const { id } = await createReadyBook("pdf");
    const highlightId = seedPdfHighlight(id, { text: "Exported quote", page: 1 });
    seedAttachedNote(id, highlightId, { content: "Exported attached note", page: 1 });
    seedStandaloneNote(id, { content: "Exported standalone note", page: 2 });

    const response = await GET(new Request(`http://test.local/api/books/${id}/export`), {
      params: Promise.resolve({ id }),
    });
    const markdown = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toContain("Reader Fixture.md");
    expect(markdown).toContain("> Exported quote");
    expect(markdown).toContain("Exported attached note");
    expect(markdown).toContain("Exported standalone note");
  });

  it("exports empty books with an empty-state line", async () => {
    await createTestEnv();
    const { id } = await createEmptyReadyBook("pdf", "Empty Export");

    const response = await GET(new Request(`http://test.local/api/books/${id}/export`), {
      params: Promise.resolve({ id }),
    });
    const markdown = await response.text();

    expect(response.status).toBe(200);
    expect(markdown).toContain("No highlights or notes yet.");
  });

  it("returns not found for missing books", async () => {
    await createTestEnv();
    const response = await GET(new Request("http://test.local/api/books/missing/export"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(response.status).toBe(404);
  });
});
