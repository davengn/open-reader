import type { BookFormat, BookSort, EditableBookMetadata } from "@/lib/types/books";

export const MAX_BOOK_BYTES = 200 * 1024 * 1024;
export const MAX_METADATA_LENGTH = 300;
export const SUPPORTED_BOOK_FORMATS: BookFormat[] = ["pdf", "epub"];
export const UPLOAD_LIMIT_MESSAGE = "File exceeds the 200 MB limit";
export const UNSUPPORTED_FILE_MESSAGE = "Only PDF and EPUB files are supported";

const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);
const EPUB_MIME_TYPES = new Set([
  "application/epub+zip",
  "application/octet-stream",
  "application/x-zip-compressed",
]);

export function detectBookFormat(filename: string, mimeType?: string | null): BookFormat | null {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() ?? "";

  if (lowerName.endsWith(".pdf") || PDF_MIME_TYPES.has(lowerMime)) {
    return "pdf";
  }

  if (lowerName.endsWith(".epub") || EPUB_MIME_TYPES.has(lowerMime)) {
    return "epub";
  }

  return null;
}

export function validateBookFile(filename: string, sizeBytes: number, mimeType?: string | null) {
  const format = detectBookFormat(filename, mimeType);

  if (!format) {
    return { ok: false as const, status: 400, error: UNSUPPORTED_FILE_MESSAGE };
  }

  if (sizeBytes > MAX_BOOK_BYTES) {
    return { ok: false as const, status: 413, error: UPLOAD_LIMIT_MESSAGE };
  }

  if (sizeBytes <= 0) {
    return { ok: false as const, status: 400, error: "The selected file is empty" };
  }

  return { ok: true as const, format };
}

export function filenameToTitle(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const spaced = withoutExtension.replace(/[_-]+/g, " ").trim();
  return spaced || "Untitled Book";
}

export function normalizeMetadataValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > MAX_METADATA_LENGTH) {
    return null;
  }

  return trimmed;
}

export function parseMetadataPatch(input: unknown):
  | { ok: true; value: Required<EditableBookMetadata> | EditableBookMetadata }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Expected a metadata object" };
  }

  const record = input as Record<string, unknown>;
  const patch: EditableBookMetadata = {};

  if ("title" in record) {
    const title = normalizeMetadataValue(record.title);
    if (!title) {
      return { ok: false, error: "Title must be 1-300 characters" };
    }
    patch.title = title;
  }

  if ("author" in record) {
    const author = normalizeMetadataValue(record.author);
    if (!author) {
      return { ok: false, error: "Author must be 1-300 characters" };
    }
    patch.author = author;
  }

  if (!patch.title && !patch.author) {
    return { ok: false, error: "Provide a title or author to update" };
  }

  return { ok: true, value: patch };
}

export function isSupportedSort(value: string): value is BookSort {
  return value === "title" || value === "author" || value === "lastRead" || value === "dateAdded";
}

export function clampReadingPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}
