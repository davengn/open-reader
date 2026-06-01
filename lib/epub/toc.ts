import type { EpubTocItem } from "@/lib/types/reader";

/**
 * Flattens a nested EPUB Table of Contents structure.
 * Filters out items with empty labels, caps depth at the specified limit,
 * and normalizes href targets.
 */
export function flattenToc(
  toc: unknown[],
  maxDepth = 2,
  currentDepth = 0
): EpubTocItem[] {
  if (!Array.isArray(toc)) return [];

  const flat: EpubTocItem[] = [];

  for (const item of toc) {
    if (!item || typeof item !== "object") continue;

    const label = String((item as any).label || "").trim();
    const href = String((item as any).href || "").trim();

    // Empty label filtering
    if (!label) continue;

    const flatItem: EpubTocItem = {
      id: String((item as any).id || href || label),
      label,
      href,
      depth: currentDepth,
    };

    flat.push(flatItem);

    // Depth capping
    const subitems = (item as any).subitems || (item as any).subitems;
    if (Array.isArray(subitems) && currentDepth < maxDepth) {
      flat.push(...flattenToc(subitems, maxDepth, currentDepth + 1));
    }
  }

  return flat;
}

/**
 * Validates if an EPUB TOC item href is valid (local internal document target).
 */
export function isValidTocHref(href: unknown): boolean {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  return trimmed.length > 0 && !/^(?:https?:)?\/\//i.test(trimmed);
}
