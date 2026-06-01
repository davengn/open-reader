import { describe, expect, it } from "vitest";
import {
  buildAnnotationItems,
  getAnnotationExcerpt,
  getLocationLabel,
  groupAnnotationItems,
  sortAnnotationItems,
} from "@/lib/reader/annotationSort";
import type { ReaderAnnotationItem, ReaderPanelHighlight } from "@/lib/types/reader";

describe("annotation sorting and grouping", () => {
  it("truncates excerpts at 120 characters", () => {
    const excerpt = getAnnotationExcerpt("a".repeat(140));
    expect(excerpt).toHaveLength(120);
    expect(excerpt.endsWith("...")).toBe(true);
  });

  it("formats PDF, EPUB, and missing location labels", () => {
    expect(getLocationLabel({ page: 12 })).toBe("Page 12");
    expect(getLocationLabel({ cfi: "epubcfi(/6/4!/4/2)" })).toBe("CFI");
    expect(getLocationLabel({})).toBe("Location unknown");
  });

  it("groups missing chapters under Uncategorized", () => {
    const items = buildAnnotationItems({ highlights: [panelHighlight({ chapter: null })], standaloneNotes: [] });
    expect(groupAnnotationItems(items)).toEqual([
      expect.objectContaining({ chapter: "Uncategorized", items: expect.any(Array) }),
    ]);
  });

  it("sorts PDF highlights by page and rectangle position", () => {
    const items = buildAnnotationItems({
      highlights: [
        panelHighlight({ id: 2, page: 2, rects: [{ x: 0.1, y: 0.8, width: 0.2, height: 0.1 }] }),
        panelHighlight({ id: 1, page: 1, rects: [{ x: 0.1, y: 0.2, width: 0.2, height: 0.1 }] }),
      ],
      standaloneNotes: [],
    });

    expect(items.map((item) => item.highlightId)).toEqual([1, 2]);
  });

  it("sorts prebuilt items by sort key", () => {
    const items: ReaderAnnotationItem[] = [
      item("b", "B:2"),
      item("a", "A:1"),
    ];
    expect(sortAnnotationItems(items).map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});

function panelHighlight(overrides: Partial<ReaderPanelHighlight> = {}): ReaderPanelHighlight {
  return {
    id: overrides.id ?? 1,
    bookId: "book-1",
    text: overrides.text ?? "Highlighted text",
    color: overrides.color ?? "yellow",
    page: overrides.page ?? 1,
    cfi: overrides.cfi ?? null,
    chapter: overrides.chapter === undefined ? "Chapter 1" : overrides.chapter,
    rects: overrides.rects ?? [{ x: 0.1, y: 0.1, width: 0.2, height: 0.1 }],
    note: overrides.note ?? null,
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
  };
}

function item(id: string, sortKey: string): ReaderAnnotationItem {
  return {
    kind: "highlight",
    id,
    bookId: "book-1",
    highlightId: 1,
    noteId: null,
    excerpt: "Text",
    fullText: "Text",
    color: "yellow",
    chapter: "Chapter",
    page: 1,
    cfi: null,
    locationLabel: "Page 1",
    noteContent: "",
    noteStatus: "idle",
    createdAt: 1,
    updatedAt: 1,
    sortKey,
  };
}
