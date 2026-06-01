import { HIGHLIGHT_COLORS } from "@/lib/types/reader";
import type { HighlightColor } from "@/lib/types/reader";

/**
 * Validates if a color is a valid highlight color.
 */
export function isValidHighlightColor(color: unknown): color is HighlightColor {
  return typeof color === "string" && (HIGHLIGHT_COLORS as readonly string[]).includes(color);
}

/**
 * Cleans and validates highlight text. Trims and collapses multiple spaces.
 * Throws if the text is empty.
 */
export function cleanHighlightText(text: unknown): string {
  if (typeof text !== "string") {
    throw new Error("Highlight text must be a string");
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    throw new Error("Highlight text cannot be empty");
  }
  return cleaned;
}

/**
 * Checks if a CFI range crosses chapters (multiple content documents).
 * In EPUB CFI, the content document separator is "!". If there are multiple content document references
 * in the range, it indicates cross-chapter selections.
 */
export function isCrossChapterCfi(cfiRange: string): boolean {
  // A CFI range usually has the structure: epubcfi(parent_path, start_offset, end_offset)
  // If the parent_path or start/end offsets contain multiple '!' content document anchors, it crosses chapters.
  const exclamationCount = (cfiRange.match(/!/g) || []).length;
  return exclamationCount > 1;
}
