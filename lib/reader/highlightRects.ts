import type { HighlightRect } from "@/lib/types/reader";

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type BoundsLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const PRECISION = 6;

export function roundRectValue(value: number) {
  return Number(value.toFixed(PRECISION));
}

export function normalizeSelectionRects(rects: RectLike[], pageBounds: BoundsLike): HighlightRect[] {
  if (!Number.isFinite(pageBounds.width) || !Number.isFinite(pageBounds.height)) {
    return [];
  }

  if (pageBounds.width <= 0 || pageBounds.height <= 0) {
    return [];
  }

  const normalized: HighlightRect[] = [];

  for (const rect of rects) {
    if (!isFiniteRectLike(rect) || rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const left = Math.max(rect.left, pageBounds.left);
    const top = Math.max(rect.top, pageBounds.top);
    const right = Math.min(rect.right, pageBounds.left + pageBounds.width);
    const bottom = Math.min(rect.bottom, pageBounds.top + pageBounds.height);
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      continue;
    }

    normalized.push({
      x: roundRectValue((left - pageBounds.left) / pageBounds.width),
      y: roundRectValue((top - pageBounds.top) / pageBounds.height),
      width: roundRectValue(width / pageBounds.width),
      height: roundRectValue(height / pageBounds.height),
    });
  }

  return mergeAdjacentRects(normalized);
}

export function validateHighlightRects(rects: unknown): rects is HighlightRect[] {
  return Array.isArray(rects) && rects.length > 0 && rects.every(isValidHighlightRect);
}

export function parseHighlightRects(value: string | null): HighlightRect[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return validateHighlightRects(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeHighlightRects(rects: HighlightRect[]) {
  if (!validateHighlightRects(rects)) {
    throw new Error("Highlight rectangles are invalid");
  }

  return JSON.stringify(rects);
}

function isValidHighlightRect(rect: unknown): rect is HighlightRect {
  if (!rect || typeof rect !== "object") {
    return false;
  }

  const candidate = rect as Record<string, unknown>;
  const values = [candidate.x, candidate.y, candidate.width, candidate.height];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return false;
  }

  const x = candidate.x as number;
  const y = candidate.y as number;
  const width = candidate.width as number;
  const height = candidate.height as number;

  return (
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1.000001 &&
    y + height <= 1.000001
  );
}

function isFiniteRectLike(rect: RectLike) {
  return [rect.left, rect.top, rect.right, rect.bottom, rect.width, rect.height].every(Number.isFinite);
}

function mergeAdjacentRects(rects: HighlightRect[]) {
  const merged: HighlightRect[] = [];

  for (const rect of rects) {
    const previous = merged.at(-1);
    const sameLine =
      previous &&
      Math.abs(previous.y - rect.y) < 0.002 &&
      Math.abs(previous.height - rect.height) < 0.002 &&
      rect.x >= previous.x + previous.width &&
      rect.x - (previous.x + previous.width) < 0.01;

    if (previous && sameLine) {
      previous.width = roundRectValue(rect.x + rect.width - previous.x);
    } else {
      merged.push({ ...rect });
    }
  }

  return merged;
}
