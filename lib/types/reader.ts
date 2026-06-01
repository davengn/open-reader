export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReaderHighlight = {
  id: number;
  bookId: string;
  page: number;
  text: string;
  color: HighlightColor;
  rects: HighlightRect[];
  createdAt: number;
  updatedAt: number;
};

export type ReaderNote = {
  id: number;
  bookId: string;
  highlightId: number | null;
  content: string;
  page: number | null;
  cfi: string | null;
  createdAt: number | null;
  updatedAt: number;
};

export type ReaderPanelHighlight = {
  id: number;
  bookId: string;
  text: string;
  color: HighlightColor;
  page: number | null;
  cfi: string | null;
  chapter: string | null;
  rects: HighlightRect[];
  note: ReaderNote | null;
  createdAt: number;
  updatedAt: number;
};

export type ReaderAnnotationKind = "highlight" | "standalone-note";

export type NoteSaveStatus = "idle" | "saving" | "saved" | "error" | "detached";

export type ReaderAnnotationItem = {
  kind: ReaderAnnotationKind;
  id: string;
  bookId: string;
  highlightId: number | null;
  noteId: number | null;
  excerpt: string;
  fullText: string;
  color: HighlightColor | null;
  chapter: string;
  page: number | null;
  cfi: string | null;
  locationLabel: string;
  noteContent: string;
  noteStatus: NoteSaveStatus;
  createdAt: number;
  updatedAt: number;
  sortKey: string;
};

export type ReaderAnnotationNavigationTarget = {
  page: number | null;
  cfi: string | null;
  label: string;
};

export type ReaderProgress = {
  bookId: string;
  currentPage: number;
  percentage: number;
  updatedAt: number;
};

export type ReaderBookmark = {
  id: string;
  title: string;
  page: number;
  depth: number;
};

export type PdfRenderStatus = "loading" | "ready" | "scanned" | "error";

export type SelectionDraft = {
  page: number;
  text: string;
  rects: HighlightRect[];
  anchorX: number;
  anchorY: number;
};

export type EpubProgress = {
  bookId: string;
  cfi: string;
  percentage: number;
  chapter?: string;
  updatedAt: number;
};

export type EpubHighlight = {
  id: number;
  bookId: string;
  cfi: string;
  text: string;
  color: HighlightColor;
  chapter?: string;
  createdAt: number;
  updatedAt: number;
};

export type EpubSelectionDraft = {
  cfiRange: string;
  text: string;
  chapter?: string;
  anchorX: number;
  anchorY: number;
  isCrossChapter?: boolean;
};

export type EpubTocItem = {
  id: string;
  label: string;
  href: string;
  subitems?: EpubTocItem[];
  depth?: number;
};
