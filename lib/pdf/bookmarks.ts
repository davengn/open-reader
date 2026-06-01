import { clampPdfPage } from "@/lib/reader/progress";
import type { ReaderBookmark } from "@/lib/types/reader";
import type { PDFDestination, PDFDocumentProxy, PDFOutlineNode, RefProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

type OutlineVisit = {
  node: PDFOutlineNode;
  depth: number;
  path: number[];
};

export async function loadPdfBookmarks(pdfDoc: PDFDocumentProxy, totalPages: number): Promise<ReaderBookmark[]> {
  const outline = await pdfDoc.getOutline();
  if (!outline?.length) {
    return [];
  }

  const bookmarks: ReaderBookmark[] = [];
  await appendBookmarks(pdfDoc, outline.map((node, index) => ({ node, depth: 0, path: [index + 1] })), totalPages, bookmarks);
  return bookmarks;
}

async function appendBookmarks(
  pdfDoc: PDFDocumentProxy,
  queue: OutlineVisit[],
  totalPages: number,
  bookmarks: ReaderBookmark[],
) {
  for (const visit of queue) {
    const title = normalizeBookmarkTitle(visit.node.title);
    const page = await resolveBookmarkPage(pdfDoc, visit.node.dest, totalPages);

    if (title && page) {
      bookmarks.push({
        id: visit.path.join("."),
        title,
        page,
        depth: visit.depth,
      });
    }

    if (visit.node.items.length > 0) {
      await appendBookmarks(
        pdfDoc,
        visit.node.items.map((node, index) => ({
          node,
          depth: visit.depth + 1,
          path: [...visit.path, index + 1],
        })),
        totalPages,
        bookmarks,
      );
    }
  }
}

async function resolveBookmarkPage(
  pdfDoc: PDFDocumentProxy,
  dest: string | PDFDestination | null,
  totalPages: number,
): Promise<number | null> {
  const explicitDestination = typeof dest === "string" ? await pdfDoc.getDestination(dest) : dest;
  const target = explicitDestination?.[0];

  if (typeof target === "number") {
    return clampPdfPage(target + 1, totalPages);
  }

  if (isRefProxy(target)) {
    const pageIndex = await pdfDoc.getPageIndex(target);
    return clampPdfPage(pageIndex + 1, totalPages);
  }

  return null;
}

function normalizeBookmarkTitle(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isRefProxy(value: unknown): value is RefProxy {
  return (
    typeof value === "object" &&
    value !== null &&
    Number.isInteger((value as RefProxy).num) &&
    Number.isInteger((value as RefProxy).gen)
  );
}
