import { describe, expect, it } from "vitest";
import { loadPdfBookmarks } from "@/lib/pdf/bookmarks";
import type { PDFDocumentProxy, PDFOutlineNode, RefProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

describe("PDF bookmark helpers", () => {
  it("flattens PDF outline entries with resolved pages and depth", async () => {
    const doc = createPdfDoc([
      outlineNode("Chapter 1", [{ num: 1, gen: 0 }], [outlineNode("Section 1.1", [4])]),
      outlineNode("Chapter 2", "chapter-two"),
    ]);

    const bookmarks = await loadPdfBookmarks(doc, 12);

    expect(bookmarks).toEqual([
      { id: "1", title: "Chapter 1", page: 2, depth: 0 },
      { id: "1.1", title: "Section 1.1", page: 5, depth: 1 },
      { id: "2", title: "Chapter 2", page: 8, depth: 0 },
    ]);
  });

  it("returns an empty list when the PDF has no outline", async () => {
    const doc = createPdfDoc(null);

    await expect(loadPdfBookmarks(doc, 4)).resolves.toEqual([]);
  });

  it("skips outline entries without a usable destination or title", async () => {
    const doc = createPdfDoc([
      outlineNode("   ", [0]),
      outlineNode("External link", null),
      outlineNode("Appendix", [99]),
    ]);

    await expect(loadPdfBookmarks(doc, 5)).resolves.toEqual([{ id: "3", title: "Appendix", page: 5, depth: 0 }]);
  });
});

function outlineNode(
  title: string,
  dest: PDFOutlineNode["dest"],
  items: PDFOutlineNode[] = [],
): PDFOutlineNode {
  return {
    title,
    bold: false,
    italic: false,
    color: new Uint8ClampedArray([0, 0, 0]),
    dest,
    url: null,
    items,
  };
}

function createPdfDoc(outline: PDFOutlineNode[] | null): PDFDocumentProxy {
  return {
    numPages: 12,
    getOutline: async () => outline,
    getDestination: async (id: string) => (id === "chapter-two" ? [{ num: 7, gen: 0 }] : null),
    getPageIndex: async (ref: RefProxy) => ref.num,
  } as PDFDocumentProxy;
}
