export const MIN_PAGE = 1;

export function normalizeTotalPages(totalPages: number): number {
  if (!Number.isInteger(totalPages) || totalPages < MIN_PAGE) {
    throw new Error("Total pages must be a positive integer");
  }

  return totalPages;
}

export function clampPdfPage(page: number, totalPages: number): number {
  const normalizedTotal = normalizeTotalPages(totalPages);
  if (!Number.isFinite(page)) {
    return MIN_PAGE;
  }

  return Math.min(normalizedTotal, Math.max(MIN_PAGE, Math.round(page)));
}

export function calculatePdfProgress(page: number, totalPages: number): number {
  const clampedPage = clampPdfPage(page, totalPages);
  const raw = (clampedPage / totalPages) * 100;
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
}

export function parsePageInput(value: string, totalPages: number, fallbackPage = MIN_PAGE): number {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return clampPdfPage(fallbackPage, totalPages);
  }

  return clampPdfPage(Number.parseInt(trimmed, 10), totalPages);
}

export function normalizeProgressPercentage(percentage: number): number {
  if (!Number.isFinite(percentage)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(percentage * 10) / 10));
}
