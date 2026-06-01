export type BookFormat = "pdf" | "epub";
export type BookStatus = "indexing" | "ready" | "error";
export type BookFilter = "all" | BookFormat;
export type BookSort = "title" | "author" | "lastRead" | "dateAdded";

export type BookSummary = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  status: BookStatus;
  statusMessage?: string | null;
  coverUrl?: string | null;
  readingPercent: number;
  lastReadAt?: number | null;
  createdAt: number;
  updatedAt?: number;
};

export type BookStatusPayload = {
  id: string;
  status: BookStatus;
  statusMessage?: string | null;
  readingPercent: number;
  updatedAt: number;
};

export type BookRecord = BookSummary & {
  filePath: string;
  fileSizeBytes: number;
  sha256: string;
  coverPath?: string | null;
  coverHash?: string | null;
  totalPages?: number | null;
  totalLocations?: number | null;
};

export type EditableBookMetadata = {
  title?: string;
  author?: string;
};
