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

