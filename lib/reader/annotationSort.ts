import type { ReaderAnnotationItem, ReaderNote, ReaderPanelHighlight } from "@/lib/types/reader";

export const UNCATEGORIZED_CHAPTER = "Uncategorized";
export const ANNOTATION_EXCERPT_LIMIT = 120;

export function getAnnotationExcerpt(text: string, limit = ANNOTATION_EXCERPT_LIMIT) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

export function getLocationLabel(input: { page?: number | null; cfi?: string | null }) {
  if (input.page) {
    return `Page ${input.page}`;
  }

  if (input.cfi) {
    return "CFI";
  }

  return "Location unknown";
}

export function toHighlightAnnotationItem(highlight: ReaderPanelHighlight): ReaderAnnotationItem {
  const chapter = normalizeChapter(highlight.chapter);
  const firstRect = highlight.rects[0];
  return {
    kind: "highlight",
    id: `highlight-${highlight.id}`,
    bookId: highlight.bookId,
    highlightId: highlight.id,
    noteId: highlight.note?.id ?? null,
    excerpt: getAnnotationExcerpt(highlight.text),
    fullText: highlight.text,
    color: highlight.color,
    chapter,
    page: highlight.page,
    cfi: highlight.cfi,
    locationLabel: getLocationLabel(highlight),
    noteContent: highlight.note?.content ?? "",
    noteStatus: "idle",
    createdAt: highlight.createdAt,
    updatedAt: highlight.note?.updatedAt ?? highlight.updatedAt,
    sortKey: [
      chapter.toLocaleLowerCase(),
      String(highlight.page ?? 2147483647).padStart(10, "0"),
      String(Math.round((firstRect?.y ?? 1) * 100000)).padStart(10, "0"),
      highlight.cfi ?? "",
      String(highlight.createdAt).padStart(13, "0"),
      String(highlight.id).padStart(10, "0"),
    ].join(":"),
  };
}

export function toStandaloneNoteAnnotationItem(note: ReaderNote, chapter?: string | null): ReaderAnnotationItem {
  const normalizedChapter = normalizeChapter(chapter);
  return {
    kind: "standalone-note",
    id: `note-${note.id}`,
    bookId: note.bookId,
    highlightId: null,
    noteId: note.id,
    excerpt: getAnnotationExcerpt(note.content),
    fullText: note.content,
    color: null,
    chapter: normalizedChapter,
    page: note.page,
    cfi: note.cfi,
    locationLabel: getLocationLabel(note),
    noteContent: note.content,
    noteStatus: "idle",
    createdAt: note.createdAt ?? note.updatedAt,
    updatedAt: note.updatedAt,
    sortKey: [
      normalizedChapter.toLocaleLowerCase(),
      String(note.page ?? 2147483647).padStart(10, "0"),
      note.cfi ?? "",
      String(note.createdAt ?? note.updatedAt).padStart(13, "0"),
      String(note.id).padStart(10, "0"),
    ].join(":"),
  };
}

export function sortAnnotationItems<T extends ReaderAnnotationItem>(items: T[]) {
  return [...items].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function groupAnnotationItems(items: ReaderAnnotationItem[]) {
  const groups = new Map<string, ReaderAnnotationItem[]>();
  for (const item of sortAnnotationItems(items)) {
    const chapter = normalizeChapter(item.chapter);
    groups.set(chapter, [...(groups.get(chapter) ?? []), item]);
  }

  return Array.from(groups, ([chapter, groupedItems]) => ({
    chapter,
    items: groupedItems,
  }));
}

export function buildAnnotationItems(input: {
  highlights: ReaderPanelHighlight[];
  standaloneNotes: ReaderNote[];
  currentChapter?: string | null;
}) {
  return sortAnnotationItems([
    ...input.highlights.map(toHighlightAnnotationItem),
    ...input.standaloneNotes.map((note) => toStandaloneNoteAnnotationItem(note, input.currentChapter)),
  ]);
}

function normalizeChapter(chapter: string | null | undefined) {
  const normalized = chapter?.trim();
  return normalized || UNCATEGORIZED_CHAPTER;
}
