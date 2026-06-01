import { describe, expect, it } from "vitest";
import { formatMarkdownExport, sanitizeMarkdownFilename } from "@/lib/reader/noteExport";
import type { AnnotationExportData } from "@/lib/db/queries/notes";

describe("note export", () => {
  it("sanitizes filenames", () => {
    expect(sanitizeMarkdownFilename('A/B: "Book"?')).toBe("A B Book.md");
    expect(sanitizeMarkdownFilename("   ")).toBe("highlights-and-notes.md");
  });

  it("formats highlights, attached notes, standalone notes, and metadata", () => {
    const markdown = formatMarkdownExport(exportData(), "2026-06-01T00:00:00.000Z");

    expect(markdown).toContain("# Reader Fixture");
    expect(markdown).toContain("Author: Open Reader");
    expect(markdown).toContain("Exported: 2026-06-01T00:00:00.000Z");
    expect(markdown).toContain("## Chapter 1");
    expect(markdown).toContain("> Important passage");
    expect(markdown).toContain("_Page 4 - yellow_");
    expect(markdown).toContain("Attached note");
    expect(markdown).toContain("Standalone note");
  });

  it("formats an empty export", () => {
    const markdown = formatMarkdownExport({ ...exportData(), highlights: [], standaloneNotes: [] }, "2026-06-01T00:00:00.000Z");
    expect(markdown).toContain("No highlights or notes yet.");
  });
});

function exportData(): AnnotationExportData {
  return {
    book: { id: "book-1", title: "Reader Fixture", author: "Open Reader", format: "pdf" },
    highlights: [
      {
        id: 1,
        bookId: "book-1",
        text: "Important passage",
        color: "yellow",
        page: 4,
        cfi: null,
        chapter: "Chapter 1",
        rects: [],
        note: {
          id: 2,
          bookId: "book-1",
          highlightId: 1,
          content: "Attached note",
          page: 4,
          cfi: null,
          createdAt: 1,
          updatedAt: 1,
        },
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    standaloneNotes: [
      {
        id: 3,
        bookId: "book-1",
        highlightId: null,
        content: "Standalone note",
        page: 5,
        cfi: null,
        createdAt: 2,
        updatedAt: 2,
      },
    ],
  };
}
