/**
 * Normalizes progress percentage to a value between 0 and 100, rounded to 1 decimal place.
 * Handles both fraction (0 to 1) and percentage (0 to 100) representations.
 */
export function normalizeProgressPercent(percent: unknown): number {
  if (percent === null || percent === undefined) return 0;
  let num = typeof percent === "number" ? percent : parseFloat(String(percent));
  if (isNaN(num)) return 0;

  let val = num;
  // If the value is between 0 and 1 (exclusive), or exactly 1 (meaning 100%),
  // we assume it is a fraction and multiply by 100.
  // Note: if the value is exactly 0, it stays 0.
  if (val > 0 && val <= 1) {
    val = val * 100;
  }

  // Clamp to [0, 100]
  val = Math.max(0, Math.min(100, val));
  // Round to one decimal place
  return Math.round(val * 10) / 10;
}

/**
 * Normalizes chapter title. Trims whitespace and provides a default.
 */
export function normalizeChapterTitle(chapter: unknown): string {
  if (chapter === null || chapter === undefined) return "Unknown Chapter";
  const trimmed = String(chapter).trim();
  return trimmed || "Unknown Chapter";
}
