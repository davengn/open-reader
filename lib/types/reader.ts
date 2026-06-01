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
