import { describe, expect, it } from "vitest";
import { parsePageInput } from "@/lib/reader/progress";

describe("PDF page navigation", () => {
  it("uses direct numeric page entries", () => {
    expect(parsePageInput("12", 20, 1)).toBe(12);
  });

  it("snaps entries below or above the document bounds", () => {
    expect(parsePageInput("0", 20, 10)).toBe(1);
    expect(parsePageInput("21", 20, 10)).toBe(20);
  });

  it("keeps the current page for invalid input", () => {
    expect(parsePageInput("", 20, 7)).toBe(7);
    expect(parsePageInput("4.5", 20, 7)).toBe(7);
  });
});
