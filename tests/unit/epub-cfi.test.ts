import { describe, expect, it } from "vitest";
import { isValidCfi, normalizeCfi } from "@/lib/epub/cfi";
import { normalizeProgressPercent, normalizeChapterTitle } from "@/lib/reader/epubProgress";

describe("EPUB CFI utilities", () => {
  describe("isValidCfi", () => {
    it("validates correct CFIs", () => {
      expect(isValidCfi("epubcfi(/6/4[chap-2]!/4/2/10/1:0)")).toBe(true);
      expect(isValidCfi(" epubcfi(/6/2) ")).toBe(true);
    });

    it("rejects invalid CFIs", () => {
      expect(isValidCfi("/6/4[chap-2]!")).toBe(false);
      expect(isValidCfi("epubcfi(")).toBe(false);
      expect(isValidCfi(null)).toBe(false);
      expect(isValidCfi(undefined)).toBe(false);
    });
  });

  describe("normalizeCfi", () => {
    it("returns already normalized CFIs trimmed", () => {
      expect(normalizeCfi(" epubcfi(/6/2) ")).toBe("epubcfi(/6/2)");
    });

    it("wraps unwrapped CFI paths", () => {
      expect(normalizeCfi("/6/2")).toBe("epubcfi(/6/2)");
    });

    it("returns raw string if not a path", () => {
      expect(normalizeCfi("invalid")).toBe("invalid");
    });
  });

  describe("normalizeProgressPercent", () => {
    it("normalizes fractions to percentages", () => {
      expect(normalizeProgressPercent(0.1234)).toBe(12.3);
      expect(normalizeProgressPercent(0.5)).toBe(50.0);
      expect(normalizeProgressPercent(1.0)).toBe(100.0);
    });

    it("keeps already scaled percentages", () => {
      expect(normalizeProgressPercent(45.67)).toBe(45.7);
      expect(normalizeProgressPercent(0)).toBe(0);
      expect(normalizeProgressPercent(100)).toBe(100);
    });

    it("clamps values", () => {
      expect(normalizeProgressPercent(150)).toBe(100);
      expect(normalizeProgressPercent(-10)).toBe(0);
    });

    it("returns 0 for invalid inputs", () => {
      expect(normalizeProgressPercent(null)).toBe(0);
      expect(normalizeProgressPercent("invalid")).toBe(0);
    });
  });

  describe("normalizeChapterTitle", () => {
    it("trims and falls back for chapters", () => {
      expect(normalizeChapterTitle("  Chapter 1  ")).toBe("Chapter 1");
      expect(normalizeChapterTitle("")).toBe("Unknown Chapter");
      expect(normalizeChapterTitle(null)).toBe("Unknown Chapter");
    });
  });
});
