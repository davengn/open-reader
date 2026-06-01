import { describe, expect, it } from "vitest";
import { calculatePdfProgress, clampPdfPage, parsePageInput } from "@/lib/reader/progress";

describe("PDF progress helpers", () => {
  it("clamps page numbers to the document bounds", () => {
    expect(clampPdfPage(-10, 12)).toBe(1);
    expect(clampPdfPage(4.6, 12)).toBe(5);
    expect(clampPdfPage(99, 12)).toBe(12);
  });

  it("calculates a one-decimal percentage", () => {
    expect(calculatePdfProgress(1, 3)).toBe(33.3);
    expect(calculatePdfProgress(3, 3)).toBe(100);
  });

  it("rejects invalid totals", () => {
    expect(() => clampPdfPage(1, 0)).toThrow("Total pages");
    expect(() => calculatePdfProgress(1, Number.NaN)).toThrow("Total pages");
  });

  it("parses direct page input with fallback and bounds snapping", () => {
    expect(parsePageInput(" 8 ", 10, 1)).toBe(8);
    expect(parsePageInput("999", 10, 1)).toBe(10);
    expect(parsePageInput("abc", 10, 4)).toBe(4);
  });
});
