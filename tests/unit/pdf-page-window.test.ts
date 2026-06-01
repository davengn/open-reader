import { describe, expect, it } from "vitest";
import { getContinuousPageWindow, getPdfPageNumbers } from "@/lib/reader/pageWindow";

describe("PDF continuous page window helpers", () => {
  it("returns a centered page window around the active page", () => {
    expect(getContinuousPageWindow(5, 10, 2)).toEqual([3, 4, 5, 6, 7]);
  });

  it("clamps the render window at document boundaries", () => {
    expect(getContinuousPageWindow(1, 10, 2)).toEqual([1, 2, 3]);
    expect(getContinuousPageWindow(10, 10, 2)).toEqual([8, 9, 10]);
  });

  it("normalizes invalid page and radius inputs", () => {
    expect(getContinuousPageWindow(999, 4, -1)).toEqual([2, 3, 4]);
  });

  it("creates stable page numbers for the navigation panel", () => {
    expect(getPdfPageNumbers(null)).toEqual([]);
    expect(getPdfPageNumbers(4)).toEqual([1, 2, 3, 4]);
  });
});
