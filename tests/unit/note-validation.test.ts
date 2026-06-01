import { describe, expect, it } from "vitest";
import {
  NOTE_MAX_LENGTH,
  NOTE_MAX_LENGTH_ERROR,
  canDetachDeletedHighlight,
  isSameBookHighlight,
  isWhitespaceOnlyNote,
  sanitizeNoteSearchQuery,
  validateNoteContent,
  validatePdfPage,
  validateStandaloneLocator,
} from "@/lib/reader/noteValidation";

describe("note validation", () => {
  it("accepts text up to the maximum note length", () => {
    expect(validateNoteContent("x".repeat(NOTE_MAX_LENGTH))).toEqual({ ok: true });
  });

  it("rejects text over the maximum note length", () => {
    expect(validateNoteContent("x".repeat(NOTE_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: NOTE_MAX_LENGTH_ERROR,
    });
  });

  it("detects whitespace-only delete content", () => {
    expect(isWhitespaceOnlyNote(" \n\t ")).toBe(true);
    expect(isWhitespaceOnlyNote(" note ")).toBe(false);
  });

  it("validates standalone PDF and EPUB locators", () => {
    expect(validatePdfPage(2)).toBe(true);
    expect(validatePdfPage(0)).toBe(false);
    expect(validateStandaloneLocator({ page: 3 }).ok).toBe(true);
    expect(validateStandaloneLocator({ cfi: "epubcfi(/6/4[chap]!/4/2/1:0)" }).ok).toBe(true);
    expect(validateStandaloneLocator({ cfi: "not-a-cfi" }).ok).toBe(false);
  });

  it("validates same-book highlight ownership and deleted-highlight detach fallback", () => {
    expect(isSameBookHighlight({ bookId: "book-1" }, "book-1")).toBe(true);
    expect(isSameBookHighlight({ bookId: "book-2" }, "book-1")).toBe(false);
    expect(canDetachDeletedHighlight({ page: 1 })).toBe(true);
    expect(canDetachDeletedHighlight({ page: null, cfi: null })).toBe(false);
  });

  it("sanitizes FTS query tokens", () => {
    expect(sanitizeNoteSearchQuery('  alpha   "beta"  ')).toBe('"alpha" """beta"""');
    expect(sanitizeNoteSearchQuery("   ")).toBe("");
  });
});
