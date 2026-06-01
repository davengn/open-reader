import { isValidCfi } from "@/lib/epub/cfi";

export const NOTE_MAX_LENGTH = 50000;
export const NOTE_MAX_LENGTH_ERROR = "Note content exceeds the maximum length of 50 000 characters.";

export type NoteValidationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export function isWhitespaceOnlyNote(content: string) {
  return content.trim().length === 0;
}

export function validateNoteContent(content: unknown): NoteValidationResult {
  if (typeof content !== "string") {
    return { ok: false, error: "Note content is required." };
  }

  if (content.length > NOTE_MAX_LENGTH) {
    return { ok: false, error: NOTE_MAX_LENGTH_ERROR };
  }

  return { ok: true };
}

export function validatePdfPage(page: unknown): page is number {
  return Number.isInteger(page) && Number(page) >= 1;
}

export function validateStandaloneLocator(input: { page?: number | null; cfi?: string | null }): NoteValidationResult {
  if (input.page != null) {
    return validatePdfPage(input.page) ? { ok: true } : { ok: false, error: "Standalone PDF notes require a positive page." };
  }

  if (input.cfi != null && input.cfi.trim() && isValidCfi(input.cfi)) {
    return { ok: true };
  }

  return { ok: false, error: "Standalone notes require a PDF page or EPUB CFI." };
}

export function isSameBookHighlight(highlight: { bookId: string } | null | undefined, bookId: string) {
  return Boolean(highlight && highlight.bookId === bookId);
}

export function canDetachDeletedHighlight(input: { page?: number | null; cfi?: string | null }) {
  return validateStandaloneLocator(input).ok;
}

export function sanitizeNoteSearchQuery(query: string | null | undefined) {
  const normalized = (query ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((token) => token.replace(/"/g, "\"\""))
    .filter(Boolean)
    .map((token) => `"${token}"`)
    .join(" ");
}
