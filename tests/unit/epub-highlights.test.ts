import { describe, expect, it } from "vitest";
import { isValidHighlightColor, cleanHighlightText, isCrossChapterCfi } from "@/lib/epub/highlights";

describe("EPUB highlights utilities", () => {
  describe("isValidHighlightColor", () => {
    it("accepts valid colors", () => {
      expect(isValidHighlightColor("yellow")).toBe(true);
      expect(isValidHighlightColor("green")).toBe(true);
      expect(isValidHighlightColor("blue")).toBe(true);
      expect(isValidHighlightColor("pink")).toBe(true);
    });

    it("rejects invalid colors", () => {
      expect(isValidHighlightColor("red")).toBe(false);
      expect(isValidHighlightColor("")).toBe(false);
      expect(isValidHighlightColor(null)).toBe(false);
    });
  });

  describe("cleanHighlightText", () => {
    it("trims and collapses whitespace", () => {
      expect(cleanHighlightText("  Some   highlighted    text  ")).toBe("Some highlighted text");
    });

    it("throws for empty or invalid text", () => {
      expect(() => cleanHighlightText("   ")).toThrow("Highlight text cannot be empty");
      expect(() => cleanHighlightText(123)).toThrow("Highlight text must be a string");
    });
  });

  describe("isCrossChapterCfi", () => {
    it("detects single chapter CFI ranges", () => {
      expect(isCrossChapterCfi("epubcfi(/6/4[chap-2]!/4/2/10/1:0,/2/1:0,/4/1:5)")).toBe(false);
    });

    it("detects cross-chapter CFI ranges", () => {
      expect(isCrossChapterCfi("epubcfi(/6/4[chap-2]!/4/2,/6/6[chap-3]!/4/2)")).toBe(true);
    });
  });
});
