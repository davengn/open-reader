import { describe, expect, it } from "vitest";
import { loadStoredZoom, normalizeZoom, READER_ZOOM_KEY, saveStoredZoom } from "@/lib/reader/zoom";

describe("reader zoom preference", () => {
  it("normalizes allowed zoom values", () => {
    expect(normalizeZoom("0.75")).toBe(0.75);
    expect(normalizeZoom(2)).toBe(2);
  });

  it("falls back to 100 percent for invalid values", () => {
    expect(normalizeZoom("banana")).toBe(1);
    expect(normalizeZoom(1.1)).toBe(1);
    expect(loadStoredZoom({ getItem: () => "5" })).toBe(1);
  });

  it("serializes the normalized value", () => {
    const values = new Map<string, string>();

    saveStoredZoom(
      {
        setItem: (key, value) => {
          values.set(key, value);
        },
      },
      1.5,
    );

    expect(values.get(READER_ZOOM_KEY)).toBe("1.5");
  });
});
