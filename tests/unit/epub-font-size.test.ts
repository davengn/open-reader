import { describe, expect, it } from "vitest";
import {
  loadStoredFontSize,
  normalizeFontSize,
  EPUB_FONT_SIZE_KEY,
  saveStoredFontSize,
} from "@/lib/reader/fontSize";

describe("EPUB font size preference", () => {
  it("normalizes allowed font size values", () => {
    expect(normalizeFontSize("14")).toBe(14);
    expect(normalizeFontSize(18)).toBe(18);
    expect(normalizeFontSize("20")).toBe(20);
  });

  it("falls back to 16px for invalid values", () => {
    expect(normalizeFontSize("banana")).toBe(16);
    expect(normalizeFontSize(15)).toBe(16);
    expect(normalizeFontSize(null)).toBe(16);
    expect(normalizeFontSize(undefined)).toBe(16);
    expect(loadStoredFontSize({ getItem: () => "invalid" })).toBe(16);
  });

  it("serializes the normalized value", () => {
    const values = new Map<string, string>();

    saveStoredFontSize(
      {
        setItem: (key, value) => {
          values.set(key, value);
        },
      },
      18,
    );

    expect(values.get(EPUB_FONT_SIZE_KEY)).toBe("18");
  });

  it("returns default 16px if storage is not available", () => {
    expect(loadStoredFontSize(null)).toBe(16);
    expect(loadStoredFontSize(undefined)).toBe(16);
  });
});
