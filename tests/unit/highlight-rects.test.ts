import { describe, expect, it } from "vitest";
import { normalizeSelectionRects, serializeHighlightRects, validateHighlightRects } from "@/lib/reader/highlightRects";

describe("highlight rectangle helpers", () => {
  it("normalizes viewport rectangles to page-relative coordinates", () => {
    const rects = normalizeSelectionRects(
      [{ left: 120, top: 240, right: 220, bottom: 270, width: 100, height: 30 }],
      { left: 20, top: 40, width: 400, height: 600 },
    );

    expect(rects).toEqual([{ x: 0.25, y: 0.333333, width: 0.25, height: 0.05 }]);
  });

  it("filters zero-size and out-of-page rectangles", () => {
    const rects = normalizeSelectionRects(
      [
        { left: 0, top: 0, right: 0, bottom: 20, width: 0, height: 20 },
        { left: 500, top: 500, right: 520, bottom: 520, width: 20, height: 20 },
        { left: 20, top: 20, right: 120, bottom: 40, width: 100, height: 20 },
      ],
      { left: 0, top: 0, width: 200, height: 200 },
    );

    expect(rects).toEqual([{ x: 0.1, y: 0.1, width: 0.5, height: 0.1 }]);
  });

  it("rejects invalid persisted rectangles", () => {
    expect(validateHighlightRects([])).toBe(false);
    expect(validateHighlightRects([{ x: 0, y: 0, width: 0, height: 0.1 }])).toBe(false);
    expect(validateHighlightRects([{ x: 0.9, y: 0, width: 0.2, height: 0.1 }])).toBe(false);
    expect(() => serializeHighlightRects([{ x: 0, y: 0, width: 0, height: 1 }])).toThrow();
  });
});
