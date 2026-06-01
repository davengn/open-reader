import { clampPdfPage, normalizeTotalPages } from "@/lib/reader/progress";

export const DEFAULT_CONTINUOUS_PAGE_RADIUS = 2;

export function getContinuousPageWindow(
  currentPage: number,
  totalPages: number,
  radius = DEFAULT_CONTINUOUS_PAGE_RADIUS,
): number[] {
  const normalizedTotal = normalizeTotalPages(totalPages);
  const normalizedRadius = Number.isInteger(radius) && radius > 0 ? radius : DEFAULT_CONTINUOUS_PAGE_RADIUS;
  const clampedPage = clampPdfPage(currentPage, normalizedTotal);
  const start = Math.max(1, clampedPage - normalizedRadius);
  const end = Math.min(normalizedTotal, clampedPage + normalizedRadius);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getPdfPageNumbers(totalPages: number | null): number[] {
  if (!totalPages) {
    return [];
  }

  const normalizedTotal = normalizeTotalPages(totalPages);
  return Array.from({ length: normalizedTotal }, (_, index) => index + 1);
}
